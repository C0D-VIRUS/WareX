import { Router } from 'express'
import { prisma } from '../db/prisma.js'
import { asyncHandler } from '../middleware/error.js'
import { authenticate, requireRoles } from '../middleware/auth.js'
import { makeBusinessId } from '../utils/ids.js'
import { notify, notifyUsersByRole } from '../utils/notify.js'

const router = Router()
router.use(authenticate)

router.get('/', requireRoles('admin', 'warehouse_manager', 'business_customer'), asyncHandler(async (req, res) => {
  const where = req.user.role.id === 'business_customer' ? { customerId: req.user.id } : {}
  res.json(await prisma.returnRequest.findMany({
    where,
    include: { customer: { select: { fullName: true, email: true } }, order: true, sku: true },
    orderBy: { createdAt: 'desc' },
  }))
}))

router.post('/', requireRoles('business_customer', 'admin'), asyncHandler(async (req, res) => {
  const customerId = req.user.role.id === 'business_customer' ? req.user.id : req.body?.customerId
  const { orderId, skuId, reason } = req.body || {}
  if (!customerId || !orderId || !reason) return res.status(400).json({ message: 'customerId, orderId and reason are required.' })

  const order = await prisma.order.findUnique({ where: { id: orderId }, include: { items: true } })
  if (!order || (req.user.role.id === 'business_customer' && order.customerId !== req.user.id)) {
    return res.status(404).json({ message: 'Order not found for this customer.' })
  }
  if (!['DELIVERED', 'CLOSED'].includes(order.status)) {
    return res.status(409).json({ message: 'A return can only be requested after the order has been delivered.' })
  }
  if (skuId && !order.items.some((item) => item.skuId === skuId)) {
    return res.status(400).json({ message: 'The selected SKU is not part of this order.' })
  }

  const record = await prisma.returnRequest.create({
    data: { returnId: makeBusinessId('RET'), customerId, orderId, skuId: skuId || null, reason: String(reason).trim() },
  })
  const notifiedCount = await notifyUsersByRole('admin', 'COMPLAINT', `Return ${record.returnId} is awaiting review.`)
  res.status(201).json({ ...record, routing: { recipientRoleId: 'admin', recipientRole: 'Main Admin', recipientCount: notifiedCount } })
}))

router.patch('/:id/status', requireRoles('admin', 'warehouse_manager'), asyncHandler(async (req, res) => {
  const status = req.body?.status
  if (!['REQUESTED', 'APPROVED', 'REJECTED', 'RECEIVED', 'COMPLETED'].includes(status)) return res.status(400).json({ message: 'Invalid return status.' })
  const existing = await prisma.returnRequest.findUnique({ where: { id: req.params.id } })
  if (!existing) return res.status(404).json({ message: 'Return request not found.' })
  const transitions = { REQUESTED: ['APPROVED', 'REJECTED'], APPROVED: ['RECEIVED'], RECEIVED: ['COMPLETED'], REJECTED: [], COMPLETED: [] }
  if (!transitions[existing.status]?.includes(status)) {
    return res.status(409).json({ message: `A return cannot move from ${existing.status} to ${status}.`, currentStatus: existing.status, allowedNextStatuses: transitions[existing.status] || [] })
  }
  const updated = await prisma.returnRequest.updateMany({ where: { id: existing.id, status: existing.status }, data: { status, inspectionResult: req.body?.inspectionResult ?? undefined } })
  if (updated.count !== 1) return res.status(409).json({ message: 'Return status changed. Refresh and try again.' })
  const record = await prisma.returnRequest.findUnique({ where: { id: existing.id } })
  await notify(record.customerId, 'COMPLAINT', `Return ${record.returnId} is now ${status.toLowerCase()}.`)
  res.json(record)
}))

export default router
