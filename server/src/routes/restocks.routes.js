import { Router } from 'express'
import { prisma } from '../db/prisma.js'
import { asyncHandler } from '../middleware/error.js'
import { authenticate, requireRoles } from '../middleware/auth.js'
import { makeBusinessId } from '../utils/ids.js'
import { notify, notifyUsersByRole } from '../utils/notify.js'
import { syncLowStockAlert } from '../utils/stock-alerts.js'

const router = Router()
router.use(authenticate)

router.get('/', requireRoles('admin', 'warehouse_manager', 'manufacturer'), asyncHandler(async (req, res) => {
  const where = req.user.role.id === 'manufacturer' ? { dealerId: req.user.id } : {}
  const restocks = await prisma.restockShipment.findMany({
    where,
    include: { dealer: { select: { fullName: true, email: true } }, destination: true, items: { include: { sku: true } } },
    orderBy: { createdAt: 'desc' },
  })
  res.json(restocks)
}))

router.post('/', requireRoles('manufacturer', 'admin'), asyncHandler(async (req, res) => {
  const dealerId = req.user.role.id === 'manufacturer' ? req.user.id : req.body?.dealerId
  const { destinationId, items = [], documentReference } = req.body || {}
  if (!dealerId || !destinationId || !Array.isArray(items) || items.length === 0) return res.status(400).json({ message: 'dealerId, destinationId and at least one item are required.' })
  if (items.some((item) => !item.skuId || !Number.isInteger(Number(item.quantity)) || Number(item.quantity) <= 0)) return res.status(400).json({ message: 'Every restock item must have a SKU and a positive integer quantity.' })

  const shipment = await prisma.$transaction(async (tx) => {
    const created = await tx.restockShipment.create({
      data: {
        restockId: makeBusinessId('RST'),
        dealerId,
        destinationId,
        documentReference: documentReference || null,
        status: 'SUBMITTED',
        items: {
          create: items.map((item) => ({ skuId: item.skuId, quantity: Number(item.quantity) })),
        },
      },
      include: { items: { include: { sku: true } }, destination: true },
    })
    for (const item of created.items) {
      const quantity = Number(item.quantity)
      const inventory = await tx.inventory.findUnique({ where: { warehouseId_skuId: { warehouseId: destinationId, skuId: item.skuId } } })
      if (inventory) await tx.inventory.update({ where: { id: inventory.id }, data: { incoming: { increment: quantity } } })
      else await tx.inventory.create({ data: { warehouseId: destinationId, skuId: item.skuId, quantity: 0, reserved: 0, incoming: quantity } })
    }
    return created
  })
  const notifiedCount = await notifyUsersByRole('warehouse_manager', 'RESTOCK', `Restock ${shipment.restockId} is awaiting warehouse receipt.`)
  res.status(201).json({ ...shipment, routing: { recipientRoleId: 'warehouse_manager', recipientRole: 'Warehouse Manager', recipientCount: notifiedCount } })
}))

router.post('/:id/validate', requireRoles('admin', 'warehouse_manager'), asyncHandler(async (req, res) => {
  const status = req.body?.approved === false ? 'REJECTED' : 'VALIDATED'
  const restock = await prisma.restockShipment.update({ where: { id: req.params.id }, data: { status } })
  await notify(restock.dealerId, 'RESTOCK', `Restock ${restock.restockId} was ${status.toLowerCase()}.`)
  res.json(restock)
}))

router.post('/:id/receive', requireRoles('admin', 'warehouse_manager'), asyncHandler(async (req, res) => {
  const result = await prisma.$transaction(async (tx) => {
    const restock = await tx.restockShipment.findUnique({ where: { id: req.params.id }, include: { items: true } })
    if (!restock) throw Object.assign(new Error('Restock shipment not found.'), { statusCode: 404 })
    if (!['VALIDATED', 'SUBMITTED'].includes(restock.status)) throw Object.assign(new Error('Restock must be validated before receipt.'), { statusCode: 400 })

    for (const item of restock.items) {
      const acceptedQuantity = Number(req.body?.accepted?.[item.id] ?? item.quantity)
      const safeAccepted = Math.max(0, Math.min(acceptedQuantity, item.quantity))
      const inventory = await tx.inventory.findUnique({ where: { warehouseId_skuId: { warehouseId: restock.destinationId, skuId: item.skuId } } })
      if (!inventory) {
        await tx.inventory.create({ data: { warehouseId: restock.destinationId, skuId: item.skuId, quantity: safeAccepted, reserved: 0, incoming: 0 } })
      } else {
        await tx.inventory.update({ where: { id: inventory.id }, data: { quantity: { increment: safeAccepted }, incoming: { decrement: Math.min(inventory.incoming, item.quantity) } } })
      }
      await tx.restockItem.update({ where: { id: item.id }, data: { acceptedQuantity: safeAccepted } })
      if (safeAccepted > 0) {
        await tx.stockTransaction.create({
          data: {
            transactionId: crypto.randomUUID(),
            type: 'RECEIPT',
            quantity: safeAccepted,
            referenceNo: restock.restockId,
            warehouseId: restock.destinationId,
            skuId: item.skuId,
          },
        })
      }
    }

    return tx.restockShipment.update({ where: { id: restock.id }, data: { status: 'ACCEPTED' }, include: { items: true } })
  })

  await notify(result.dealerId, 'RESTOCK', `Restock ${result.restockId} has been received and accepted.`)
  const restockDetails = await prisma.restockShipment.findUnique({ where: { id: result.id }, include: { items: true } })
  for (const item of restockDetails.items) await syncLowStockAlert(restockDetails.destinationId, item.skuId)
  res.json(result)
}))

export default router
