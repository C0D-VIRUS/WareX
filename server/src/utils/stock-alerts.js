import { prisma } from '../db/prisma.js'
import { notify } from './notify.js'

const INVISIBLE_SEPARATOR = '\u2063'

export async function syncLowStockAlert(warehouseId, skuId) {
  const inventory = await prisma.inventory.findUnique({
    where: { warehouseId_skuId: { warehouseId, skuId } },
    include: { sku: true, warehouse: true },
  })
  if (!inventory) return

  const marker = `${INVISIBLE_SEPARATOR}[LOW_STOCK:${warehouseId}:${skuId}]${INVISIBLE_SEPARATOR}`
  const existing = await prisma.notification.findMany({
    where: { type: 'INVENTORY', message: { contains: marker } },
    select: { id: true, message: true },
  })
  const activeAlerts = existing.filter((item) => !item.message.includes('[RESOLVED]'))
  const threshold = inventory.sku.reorderThreshold
  const isLow = threshold > 0 && inventory.quantity <= threshold

  if (isLow && activeAlerts.length === 0) {
    const recipients = await prisma.user.findMany({
      where: { status: 'ACTIVE', roleId: { in: ['admin', 'warehouse_manager'] } },
      select: { id: true },
    })
    const message = `LOW STOCK: ${inventory.sku.sku} — ${inventory.sku.name} at ${inventory.warehouse.name} has ${inventory.quantity} units; reorder threshold is ${threshold}. Please arrange replenishment.${marker}`
    for (const user of recipients) await notify(user.id, 'INVENTORY', message)
  } else if (!isLow && activeAlerts.length) {
    await Promise.all(activeAlerts.map((alert) => prisma.notification.update({
      where: { id: alert.id },
      data: { message: `${alert.message} [RESOLVED] Stock is now above the reorder threshold.` },
    })))
  }
}
