import { Router } from 'express'
import { prisma } from '../db/prisma.js'
import { asyncHandler } from '../middleware/error.js'
import { authenticate, requireRoles } from '../middleware/auth.js'
import { syncLowStockAlert } from '../utils/stock-alerts.js'

const router = Router()
router.use(authenticate)

router.get('/team', asyncHandler(async (req, res) => {
  const users = await prisma.user.findMany({
    where: { status: 'ACTIVE' },
    select: { id: true, fullName: true, email: true, status: true, isMainAdmin: true, createdAt: true, role: { select: { id: true, name: true } } },
    orderBy: { fullName: 'asc' },
  })
  res.json(users)
}))

router.get('/products', asyncHandler(async (req, res) => {
  const products = await prisma.sKU.findMany({
    where: { isActive: req.query.includeInactive === 'true' ? undefined : true },
    orderBy: { name: 'asc' },
  })
  res.json(products)
}))

router.get('/sell-through', requireRoles('admin', 'manufacturer'), asyncHandler(async (req, res) => {
  const [products, completedLines] = await Promise.all([
    prisma.sKU.findMany({ where: { isActive: true }, orderBy: { name: 'asc' } }),
    prisma.orderItem.findMany({
      where: { order: { status: { in: ['SHIPPED', 'DELIVERED', 'CLOSED'] } } },
      select: { skuId: true, quantity: true, lineTotal: true, orderId: true },
    }),
  ])
  const totals = new Map()
  for (const line of completedLines) {
    const current = totals.get(line.skuId) || { unitsSold: 0, revenue: 0, orderIds: new Set() }
    current.unitsSold += line.quantity
    current.revenue += Number(line.lineTotal)
    current.orderIds.add(line.orderId)
    totals.set(line.skuId, current)
  }
  res.json(products.map((product) => {
    const total = totals.get(product.id) || { unitsSold: 0, revenue: 0, orderIds: new Set() }
    return { skuId: product.id, sku: product.sku, name: product.name, category: product.category, unitPrice: Number(product.unitPrice), unitsSold: total.unitsSold, revenue: Number(total.revenue.toFixed(2)), orderCount: total.orderIds.size }
  }))
}))

router.post('/products', requireRoles('admin'), asyncHandler(async (req, res) => {
  const data = req.body || {}
  if (!data.sku || !data.name || !data.category || data.unitPrice === undefined) return res.status(400).json({ message: 'sku, name, category and unitPrice are required.' })
  const product = await prisma.$transaction(async (tx) => {
    const created = await tx.sKU.create({
      data: {
        sku: String(data.sku).trim().toUpperCase(),
        name: String(data.name).trim(),
        category: String(data.category).trim(),
        unitPrice: data.unitPrice,
        cartonSize: Number(data.cartonSize || 1),
        requiresAssembly: Boolean(data.requiresAssembly),
        reorderThreshold: Number(data.reorderThreshold || 0),
      },
    })
    const warehouses = await tx.warehouse.findMany({ where: { status: 'ACTIVE' }, select: { id: true } })
    if (warehouses.length) {
      await tx.inventory.createMany({ data: warehouses.map((warehouse) => ({ warehouseId: warehouse.id, skuId: created.id, quantity: 0, reserved: 0, incoming: 0 })) })
    }
    return created
  })
  const productInventory = await prisma.inventory.findMany({ where: { skuId: product.id }, select: { warehouseId: true, skuId: true } })
  for (const item of productInventory) await syncLowStockAlert(item.warehouseId, item.skuId)
  res.status(201).json(product)
}))

router.patch('/products/:id', requireRoles('admin'), asyncHandler(async (req, res) => {
  const data = req.body || {}
  const product = await prisma.sKU.update({
    where: { id: req.params.id },
    data: {
      ...(data.name !== undefined ? { name: String(data.name).trim() } : {}),
      ...(data.category !== undefined ? { category: String(data.category).trim() } : {}),
      ...(data.unitPrice !== undefined ? { unitPrice: data.unitPrice } : {}),
      ...(data.cartonSize !== undefined ? { cartonSize: Number(data.cartonSize) } : {}),
      ...(data.requiresAssembly !== undefined ? { requiresAssembly: Boolean(data.requiresAssembly) } : {}),
      ...(data.reorderThreshold !== undefined ? { reorderThreshold: Number(data.reorderThreshold) } : {}),
      ...(data.isActive !== undefined ? { isActive: Boolean(data.isActive) } : {}),
    },
  })
  const productInventory = await prisma.inventory.findMany({ where: { skuId: product.id }, select: { warehouseId: true, skuId: true } })
  for (const item of productInventory) await syncLowStockAlert(item.warehouseId, item.skuId)
  res.json(product)
}))

router.get('/warehouses', asyncHandler(async (req, res) => {
  const warehouses = await prisma.warehouse.findMany({
    include: { manager: { select: { id: true, fullName: true, email: true } } },
    orderBy: { name: 'asc' },
  })
  res.json(warehouses)
}))

router.post('/warehouses', requireRoles('admin'), asyncHandler(async (req, res) => {
  const { name, city, address, capacity, managerId } = req.body || {}
  if (!name || !city || !capacity) return res.status(400).json({ message: 'name, city and capacity are required.' })
  const warehouse = await prisma.warehouse.create({
    data: {
      name: String(name).trim(),
      city: String(city).trim(),
      address: address ? String(address).trim() : null,
      capacity: Number(capacity),
      managerId: managerId || null,
    },
    include: { manager: { select: { id: true, fullName: true, email: true } } },
  })
  res.status(201).json(warehouse)
}))

router.get('/inventory', requireRoles('admin', 'warehouse_manager'), asyncHandler(async (req, res) => {
  const inventory = await prisma.inventory.findMany({
    include: { sku: true, warehouse: true, rackBin: true },
    orderBy: [{ warehouse: { name: 'asc' } }, { sku: { name: 'asc' } }],
  })
  res.json(inventory)
}))

router.patch('/inventory/:id/adjust', requireRoles('admin', 'warehouse_manager'), asyncHandler(async (req, res) => {
  const delta = Number(req.body?.delta)
  if (!Number.isInteger(delta) || delta === 0) return res.status(400).json({ message: 'delta must be a non-zero integer.' })

  const result = await prisma.$transaction(async (tx) => {
    const inventory = await tx.inventory.findUnique({ where: { id: req.params.id } })
    if (!inventory) throw Object.assign(new Error('Inventory record not found.'), { statusCode: 404 })
    const nextQuantity = inventory.quantity + delta
    if (nextQuantity < 0) throw Object.assign(new Error('Inventory cannot become negative.'), { statusCode: 400 })

    const updated = await tx.inventory.update({ where: { id: inventory.id }, data: { quantity: nextQuantity } })
    await tx.stockTransaction.create({
      data: {
        transactionId: crypto.randomUUID(),
        type: 'ADJUSTMENT',
        quantity: Math.abs(delta),
        referenceNo: `ADJ-${Date.now()}`,
        note: [req.body?.reason, req.body?.note].filter(Boolean).join(': ') || (delta > 0 ? 'Manual stock increase' : 'Manual stock decrease'),
        warehouseId: inventory.warehouseId,
        skuId: inventory.skuId,
      },
    })
    return updated
  })

  await syncLowStockAlert(result.warehouseId, result.skuId)
  const refreshed = await prisma.inventory.findUnique({ where: { id: result.id }, include: { sku: true, warehouse: true, rackBin: true } })
  res.json(refreshed)
}))

export default router
