import { Router } from 'express'
import { prisma } from '../db/prisma.js'
import { asyncHandler } from '../middleware/error.js'
import { authenticate, requireRoles } from '../middleware/auth.js'
import { makeBusinessId } from '../utils/ids.js'
import { notify, notifyUsersByRole } from '../utils/notify.js'
import { syncLowStockAlert } from '../utils/stock-alerts.js'

const router = Router()
router.use(authenticate)

const includeTransfer = {
  fromWarehouse: { select: { id: true, name: true, city: true, managerId: true } },
  toWarehouse: { select: { id: true, name: true, city: true, managerId: true } },
  createdBy: { select: { id: true, fullName: true, email: true } },
  items: { include: { sku: { select: { id: true, sku: true, name: true } } } },
}

function managerOwnsWarehouse(user, warehouse) {
  return user.role.id === 'admin' || warehouse?.managerId === user.id
}

router.get('/', requireRoles('admin', 'warehouse_manager'), asyncHandler(async (req, res) => {
  const where = req.user.role.id === 'warehouse_manager'
    ? { OR: [{ fromWarehouse: { is: { managerId: req.user.id } } }, { toWarehouse: { is: { managerId: req.user.id } } }] }
    : {}
  const transfers = await prisma.warehouseTransfer.findMany({ where, include: includeTransfer, orderBy: { createdAt: 'desc' } })
  res.json(transfers)
}))

router.post('/', requireRoles('admin', 'warehouse_manager'), asyncHandler(async (req, res) => {
  const { fromWarehouseId, toWarehouseId, items } = req.body || {}
  if (!fromWarehouseId || !toWarehouseId || !Array.isArray(items) || items.length === 0) {
    return res.status(400).json({ message: 'Choose source and destination warehouses and add at least one SKU.' })
  }
  if (fromWarehouseId === toWarehouseId) return res.status(400).json({ message: 'Source and destination warehouses must be different.' })
  const normalized = items.map((item) => ({ skuId: String(item.skuId || ''), quantity: Number(item.quantity) }))
  if (normalized.some((item) => !item.skuId || !Number.isInteger(item.quantity) || item.quantity <= 0)) {
    return res.status(400).json({ message: 'Each transfer line needs a SKU and a positive whole-number quantity.' })
  }
  if (new Set(normalized.map((item) => item.skuId)).size !== normalized.length) {
    return res.status(400).json({ message: 'Each SKU can appear only once in a transfer.' })
  }

  const [from, to] = await Promise.all([
    prisma.warehouse.findUnique({ where: { id: fromWarehouseId } }),
    prisma.warehouse.findUnique({ where: { id: toWarehouseId } }),
  ])
  if (!from || !to || from.status !== 'ACTIVE' || to.status !== 'ACTIVE') return res.status(400).json({ message: 'Both warehouses must exist and be active.' })
  if (!managerOwnsWarehouse(req.user, from)) return res.status(403).json({ message: 'You can only create transfers from a warehouse you manage.' })

  const skuCount = await prisma.sKU.count({ where: { id: { in: normalized.map((item) => item.skuId) }, isActive: true } })
  if (skuCount !== normalized.length) return res.status(400).json({ message: 'One or more selected products are inactive or unavailable.' })

  const transfer = await prisma.warehouseTransfer.create({
    data: {
      transferId: makeBusinessId('TR'),
      fromWarehouseId,
      toWarehouseId,
      createdById: req.user.id,
      status: 'REQUESTED',
      items: { create: normalized },
    },
    include: includeTransfer,
  })
  const notifiedCount = await notifyUsersByRole('warehouse_manager', 'INVENTORY', `Warehouse transfer ${transfer.transferId} has been requested from ${from.name} to ${to.name}.`)
  res.status(201).json({ ...transfer, routing: { recipientRoleId: 'warehouse_manager', recipientRole: 'Warehouse Manager', recipientCount: notifiedCount } })
}))

router.patch('/:id/dispatch', requireRoles('admin', 'warehouse_manager'), asyncHandler(async (req, res) => {
  const transfer = await prisma.warehouseTransfer.findUnique({ where: { id: req.params.id }, include: includeTransfer })
  if (!transfer) return res.status(404).json({ message: 'Transfer not found.' })
  if (transfer.status !== 'REQUESTED') return res.status(409).json({ message: 'Only requested transfers can be dispatched.' })
  if (!managerOwnsWarehouse(req.user, transfer.fromWarehouse)) return res.status(403).json({ message: 'Only the source warehouse manager can dispatch this transfer.' })

  const updated = await prisma.$transaction(async (tx) => {
    const claimed = await tx.warehouseTransfer.updateMany({ where: { id: transfer.id, status: 'REQUESTED' }, data: { status: 'IN_TRANSIT', dispatchedAt: new Date() } })
    if (claimed.count !== 1) throw Object.assign(new Error('Transfer status changed. Refresh and try again.'), { statusCode: 409 })

    for (const item of transfer.items) {
      const inventory = await tx.inventory.findUnique({ where: { warehouseId_skuId: { warehouseId: transfer.fromWarehouseId, skuId: item.skuId } } })
      if (!inventory || inventory.quantity < item.quantity) {
        throw Object.assign(new Error(`Insufficient available stock for ${item.sku.sku}. No stock was moved.`), { statusCode: 409 })
      }
      await tx.inventory.update({ where: { id: inventory.id }, data: { quantity: { decrement: item.quantity } } })
      await tx.stockTransaction.create({ data: { transactionId: crypto.randomUUID(), type: 'TRANSFER_OUT', quantity: item.quantity, referenceNo: transfer.transferId, note: `Transfer dispatched to ${transfer.toWarehouse.name}`, warehouseId: transfer.fromWarehouseId, skuId: item.skuId } })

      const destinationInventory = await tx.inventory.findUnique({ where: { warehouseId_skuId: { warehouseId: transfer.toWarehouseId, skuId: item.skuId } } })
      if (destinationInventory) {
        await tx.inventory.update({ where: { id: destinationInventory.id }, data: { incoming: { increment: item.quantity } } })
      } else {
        await tx.inventory.create({ data: { warehouseId: transfer.toWarehouseId, skuId: item.skuId, quantity: 0, reserved: 0, incoming: item.quantity } })
      }
    }
    return tx.warehouseTransfer.findUnique({ where: { id: transfer.id }, include: includeTransfer })
  })

  for (const item of updated.items) await syncLowStockAlert(updated.fromWarehouseId, item.skuId)
  await notifyUsersByRole('warehouse_manager', 'INVENTORY', `Transfer ${updated.transferId} is in transit to ${updated.toWarehouse.name}.`)
  res.json(updated)
}))

router.patch('/:id/receive', requireRoles('admin', 'warehouse_manager'), asyncHandler(async (req, res) => {
  const transfer = await prisma.warehouseTransfer.findUnique({ where: { id: req.params.id }, include: includeTransfer })
  if (!transfer) return res.status(404).json({ message: 'Transfer not found.' })
  if (transfer.status !== 'IN_TRANSIT') return res.status(409).json({ message: 'Only in-transit transfers can be received.' })
  if (!managerOwnsWarehouse(req.user, transfer.toWarehouse)) return res.status(403).json({ message: 'Only the destination warehouse manager can receive this transfer.' })

  const updated = await prisma.$transaction(async (tx) => {
    const claimed = await tx.warehouseTransfer.updateMany({ where: { id: transfer.id, status: 'IN_TRANSIT' }, data: { status: 'RECEIVED', receivedAt: new Date() } })
    if (claimed.count !== 1) throw Object.assign(new Error('Transfer status changed. Refresh and try again.'), { statusCode: 409 })

    for (const item of transfer.items) {
      const inventory = await tx.inventory.findUnique({ where: { warehouseId_skuId: { warehouseId: transfer.toWarehouseId, skuId: item.skuId } } })
      if (!inventory || inventory.incoming < item.quantity) {
        throw Object.assign(new Error(`Incoming quantity could not be reconciled for ${item.sku.sku}. No receipt was committed.`), { statusCode: 409 })
      }
      await tx.inventory.update({ where: { id: inventory.id }, data: { quantity: { increment: item.quantity }, incoming: { decrement: item.quantity } } })
      await tx.stockTransaction.create({ data: { transactionId: crypto.randomUUID(), type: 'TRANSFER_IN', quantity: item.quantity, referenceNo: transfer.transferId, note: `Transfer received from ${transfer.fromWarehouse.name}`, warehouseId: transfer.toWarehouseId, skuId: item.skuId } })
      await tx.warehouseTransferItem.update({ where: { id: item.id }, data: { receivedQuantity: item.quantity } })
    }
    return tx.warehouseTransfer.findUnique({ where: { id: transfer.id }, include: includeTransfer })
  })

  for (const item of updated.items) await syncLowStockAlert(updated.toWarehouseId, item.skuId)
  await notify(transfer.createdById, 'INVENTORY', `Transfer ${updated.transferId} has been received at ${updated.toWarehouse.name}.`)
  res.json(updated)
}))

export default router
