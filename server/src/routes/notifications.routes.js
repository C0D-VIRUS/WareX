import { Router } from 'express'
import { prisma } from '../db/prisma.js'
import { asyncHandler } from '../middleware/error.js'
import { authenticate } from '../middleware/auth.js'
import { syncLowStockAlert } from '../utils/stock-alerts.js'

const router = Router()
router.use(authenticate)

router.get('/', asyncHandler(async (req, res) => {
  // Run a stock-threshold audit when warehouse/admin users open notifications.
  // This catches low-stock conditions that existed before this server session.
  if (['admin', 'warehouse_manager'].includes(req.user.role.id)) {
    const records = await prisma.inventory.findMany({ select: { warehouseId: true, skuId: true } })
    for (const item of records) await syncLowStockAlert(item.warehouseId, item.skuId)
  }
  const rows = await prisma.notification.findMany({ where: { recipientId: req.user.id }, orderBy: { createdAt: 'desc' }, take: 50 })
  res.json(rows)
}))

router.patch('/:id/read', asyncHandler(async (req, res) => {
  const row = await prisma.notification.updateMany({ where: { id: req.params.id, recipientId: req.user.id }, data: { readStatus: true } })
  res.json({ updated: row.count })
}))

router.patch('/read-all', asyncHandler(async (req, res) => {
  const row = await prisma.notification.updateMany({ where: { recipientId: req.user.id, readStatus: false }, data: { readStatus: true } })
  res.json({ updated: row.count })
}))

export default router
