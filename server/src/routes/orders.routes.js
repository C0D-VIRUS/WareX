import { Router } from 'express'
import { prisma } from '../db/prisma.js'
import { asyncHandler } from '../middleware/error.js'
import { authenticate, requireRoles } from '../middleware/auth.js'
import { makeBusinessId } from '../utils/ids.js'
import { notify, notifyUsersByRole } from '../utils/notify.js'
import { syncLowStockAlert } from '../utils/stock-alerts.js'

const router = Router()
router.use(authenticate)

const orderInclude = {
  customer: { select: { id: true, fullName: true, email: true } },
  warehouse: { select: { id: true, name: true, city: true } },
  items: { include: { sku: true } },
  shipment: true,
}

router.get('/', requireRoles('admin', 'warehouse_manager', 'business_customer'), asyncHandler(async (req, res) => {
  const where = {}
  if (req.user.role.id === 'business_customer') where.customerId = req.user.id
  if (req.query.status) where.status = req.query.status
  const orders = await prisma.order.findMany({ where, include: orderInclude, orderBy: { createdAt: 'desc' } })
  res.json(orders)
}))

router.get('/:id', requireRoles('admin', 'warehouse_manager', 'business_customer'), asyncHandler(async (req, res) => {
  const order = await prisma.order.findUnique({ where: { id: req.params.id }, include: orderInclude })
  if (!order) return res.status(404).json({ message: 'Order not found.' })
  if (req.user.role.id === 'business_customer' && order.customerId !== req.user.id) return res.status(403).json({ message: 'You cannot view this order.' })
  res.json(order)
}))

router.post('/', requireRoles('business_customer', 'admin'), asyncHandler(async (req, res) => {
  const { warehouseId, items = [], dispatchCutoff } = req.body || {}
  if (!Array.isArray(items) || items.length === 0) return res.status(400).json({ message: 'At least one order item is required.' })

  const customerId = req.user.role.id === 'business_customer' ? req.user.id : req.body.customerId
  if (!customerId) return res.status(400).json({ message: 'customerId is required for admin-created orders.' })

  const warehouse = warehouseId
    ? await prisma.warehouse.findUnique({ where: { id: warehouseId } })
    : await prisma.warehouse.findFirst({ where: { status: 'ACTIVE' }, orderBy: { name: 'asc' } })
  if (!warehouse) return res.status(400).json({ message: 'No active warehouse is available.' })

  const skus = await prisma.sKU.findMany({ where: { id: { in: items.map((item) => item.skuId) }, isActive: true } })
  if (skus.length !== items.length) return res.status(400).json({ message: 'One or more SKUs are invalid or inactive.' })

  const skuMap = new Map(skus.map((sku) => [sku.id, sku]))
  const prepared = items.map((item) => {
    const sku = skuMap.get(item.skuId)
    const quantity = Number(item.quantity)
    if (!sku || !Number.isInteger(quantity) || quantity <= 0) throw Object.assign(new Error('Every order item needs a valid positive quantity.'), { statusCode: 400 })
    const lineTotal = Number(sku.unitPrice) * quantity
    return { skuId: sku.id, quantity, unitPrice: sku.unitPrice, lineTotal }
  })

  const totalAmount = prepared.reduce((sum, item) => sum + Number(item.lineTotal), 0)
  const order = await prisma.order.create({
    data: {
      orderNumber: makeBusinessId('ORD'),
      customerId,
      warehouseId: warehouse.id,
      totalAmount,
      dispatchCutoff: dispatchCutoff ? new Date(dispatchCutoff) : null,
      status: 'PLACED',
      items: { create: prepared },
    },
    include: orderInclude,
  })

  const notifiedCount = await notifyUsersByRole('warehouse_manager', 'ORDER', `New bulk order ${order.orderNumber} is ready for validation.`)
  await notify(req.user.id, 'ORDER', `Order ${order.orderNumber} was placed successfully.`)
  res.status(201).json({ ...order, routing: { recipientRoleId: 'warehouse_manager', recipientRole: 'Warehouse Manager', recipientCount: notifiedCount } })
}))

router.post('/:id/confirm', requireRoles('admin', 'warehouse_manager'), asyncHandler(async (req, res) => {
  const existing = await prisma.order.findUnique({ where: { id: req.params.id } })
  if (!existing) return res.status(404).json({ message: 'Order not found.' })
  if (existing.status !== 'PLACED') return res.status(409).json({ message: 'Only a newly placed order can be confirmed.' })
  const order = await prisma.order.update({ where: { id: existing.id }, data: { status: 'CONFIRMED' }, include: orderInclude })
  await notify(order.customerId, 'ORDER', `Order ${order.orderNumber} has been confirmed and is awaiting stock reservation.`)
  res.json(order)
}))

router.post('/:id/reserve', requireRoles('admin', 'warehouse_manager'), asyncHandler(async (req, res) => {
  const reservation = await prisma.$transaction(async (tx) => {
    const order = await tx.order.findUnique({ where: { id: req.params.id }, include: { items: true } })
    if (!order) throw Object.assign(new Error('Order not found.'), { statusCode: 404 })
    if (!['PLACED', 'CONFIRMED', 'DELAYED'].includes(order.status)) {
      throw Object.assign(new Error('Only placed, confirmed or delayed orders can reserve stock.'), { statusCode: 409 })
    }

    // A previous version used CONFIRMED to mean both confirmed and reserved.
    // Detect its transaction trail and upgrade the state without deducting stock twice.
    if (order.status === 'CONFIRMED') {
      const priorReservation = await tx.stockTransaction.findFirst({
        where: { referenceNo: order.orderNumber, type: 'RESERVATION' },
        select: { id: true },
      })
      if (priorReservation) {
        const upgraded = await tx.order.update({ where: { id: order.id }, data: { status: 'RESERVED' }, include: orderInclude })
        return { alreadyReserved: true, order: upgraded }
      }
    }

    // Claim the order with a conditional write. Concurrent clicks cannot reserve the
    // same order twice because only one transaction can move it out of an eligible state.
    const claim = await tx.order.updateMany({
      where: { id: order.id, status: { in: ['PLACED', 'CONFIRMED', 'DELAYED'] } },
      data: { status: 'RESERVED' },
    })
    if (claim.count !== 1) {
      throw Object.assign(new Error('This order is already being processed. Refresh the order list and try again.'), { statusCode: 409 })
    }

    for (const item of order.items) {
      const inv = await tx.inventory.findUnique({ where: { warehouseId_skuId: { warehouseId: order.warehouseId, skuId: item.skuId } } })
      if (!inv || inv.quantity < item.quantity) {
        const delayed = await tx.order.update({ where: { id: order.id }, data: { status: 'DELAYED' }, include: orderInclude })
        return { delayed: true, order: delayed, affectedSkuIds: [] }
      }
    }

    for (const item of order.items) {
      const inv = await tx.inventory.findUnique({ where: { warehouseId_skuId: { warehouseId: order.warehouseId, skuId: item.skuId } } })
      await tx.inventory.update({
        where: { id: inv.id },
        data: { quantity: { decrement: item.quantity }, reserved: { increment: item.quantity } },
      })
      await tx.stockTransaction.create({
        data: {
          transactionId: crypto.randomUUID(),
          type: 'RESERVATION',
          quantity: item.quantity,
          referenceNo: order.orderNumber,
          warehouseId: order.warehouseId,
          skuId: item.skuId,
        },
      })
    }

    const updated = await tx.order.findUnique({ where: { id: order.id }, include: orderInclude })
    return { delayed: false, order: updated, affectedSkuIds: order.items.map((item) => item.skuId), warehouseId: order.warehouseId }
  })

  if (reservation.delayed) {
    await notify(reservation.order.customerId, 'ORDER', `Order ${reservation.order.orderNumber} is delayed because available stock is insufficient.`)
    const notifiedCount = await notifyUsersByRole('warehouse_manager', 'INVENTORY', `Order ${reservation.order.orderNumber} is delayed because available stock is insufficient. Please review inventory and replenishment.`)
    return res.status(409).json({ message: `Insufficient stock. ${reservation.order.orderNumber} was marked Delayed and routed to the Warehouse Manager.`, order: reservation.order, routing: { recipientRoleId: 'warehouse_manager', recipientRole: 'Warehouse Manager', recipientCount: notifiedCount } })
  }

  if (reservation.alreadyReserved) {
    return res.json(reservation.order)
  }

  for (const skuId of reservation.affectedSkuIds) await syncLowStockAlert(reservation.warehouseId, skuId)
  const updated = reservation.order
  await notify(updated.customerId, 'ORDER', `Stock has been reserved for ${updated.orderNumber}.`)
  res.json(updated)
}))

router.post('/:id/pick', requireRoles('admin', 'warehouse_manager'), asyncHandler(async (req, res) => {
  const existing = await prisma.order.findUnique({ where: { id: req.params.id } })
  if (!existing) return res.status(404).json({ message: 'Order not found.' })
  if (existing.status !== 'RESERVED') return res.status(409).json({ message: 'Stock must be reserved before picking can begin.' })
  const result = await prisma.order.updateMany({ where: { id: existing.id, status: 'RESERVED' }, data: { status: 'PICKING' } })
  if (result.count !== 1) return res.status(409).json({ message: 'Order status changed. Refresh and try again.' })
  const order = await prisma.order.findUnique({ where: { id: existing.id }, include: orderInclude })
  await notify(order.customerId, 'ORDER', `Order ${order.orderNumber} has been picked and is being packed.`)
  res.json(order)
}))

router.post('/:id/pack', requireRoles('admin', 'warehouse_manager'), asyncHandler(async (req, res) => {
  const existing = await prisma.order.findUnique({ where: { id: req.params.id } })
  if (!existing) return res.status(404).json({ message: 'Order not found.' })
  if (existing.status !== 'PICKING') return res.status(409).json({ message: 'Pick the order before marking it packed.' })
  const result = await prisma.order.updateMany({ where: { id: existing.id, status: 'PICKING' }, data: { status: 'PACKED' } })
  if (result.count !== 1) return res.status(409).json({ message: 'Order status changed. Refresh and try again.' })
  const order = await prisma.order.findUnique({ where: { id: existing.id }, include: orderInclude })
  await notify(order.customerId, 'ORDER', `Order ${order.orderNumber} is packed and ready for shipment.`)
  res.json(order)
}))

router.post('/:id/confirm-receipt', requireRoles('business_customer'), asyncHandler(async (req, res) => {
  const order = await prisma.order.findUnique({ where: { id: req.params.id }, include: { shipment: true } })
  if (!order || order.customerId !== req.user.id) return res.status(404).json({ message: 'Order not found.' })
  if (order.status !== 'DELIVERED' || (order.shipment && order.shipment.status !== 'DELIVERED')) {
    return res.status(409).json({ message: 'Receipt can only be confirmed after the shipment has been delivered.' })
  }
  const updated = await prisma.order.update({ where: { id: order.id }, data: { status: 'CLOSED' }, include: orderInclude })
  if (updated.shipment) await prisma.shipment.update({ where: { id: updated.shipment.id }, data: { status: 'CLOSED' } })
  await notifyUsersByRole('admin', 'ORDER', `Customer confirmed receipt of ${updated.orderNumber}.`)
  res.json(updated)
}))

export default router
