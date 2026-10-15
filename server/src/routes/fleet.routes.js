import { Router } from 'express'
import { prisma } from '../db/prisma.js'
import { asyncHandler } from '../middleware/error.js'
import { authenticate, requireRoles } from '../middleware/auth.js'
import { makeBusinessId } from '../utils/ids.js'

const router = Router()
router.use(authenticate)

const vehicleFields = [
  'maxWeightKg', 'maxLengthCm', 'maxWidthCm', 'maxHeightCm',
  'operatingCostPerKm', 'energyUsePerKm', 'averageSpeedKmph',
]

function vehicleData(body = {}) {
  const capacity = Number(body.capacity)
  const data = {
    registrationNo: String(body.registrationNo || '').trim().toUpperCase(),
    vehicleType: String(body.vehicleType || '').trim(),
    capacity,
    maxWeightKg: Number(body.maxWeightKg ?? capacity),
    maxLengthCm: Number(body.maxLengthCm ?? 300),
    maxWidthCm: Number(body.maxWidthCm ?? 160),
    maxHeightCm: Number(body.maxHeightCm ?? 160),
    operatingCostPerKm: Number(body.operatingCostPerKm ?? 12),
    energyUsePerKm: Number(body.energyUsePerKm ?? 0.18),
    averageSpeedKmph: Number(body.averageSpeedKmph ?? 35),
  }
  if (!data.registrationNo || !data.vehicleType || !Number.isInteger(capacity) || capacity <= 0) {
    throw Object.assign(new Error('registrationNo, vehicleType and a positive capacity are required.'), { statusCode: 400 })
  }
  for (const field of vehicleFields) {
    if (!Number.isFinite(data[field]) || data[field] <= 0) {
      throw Object.assign(new Error(`${field} must be a positive number.`), { statusCode: 400 })
    }
  }
  return data
}

router.get('/vehicles', requireRoles('admin', 'warehouse_manager', 'delivery_partner'), asyncHandler(async (req, res) => {
  res.json(await prisma.vehicle.findMany({ orderBy: { registrationNo: 'asc' } }))
}))

router.post('/vehicles', requireRoles('admin'), asyncHandler(async (req, res) => {
  const data = vehicleData(req.body)
  const vehicle = await prisma.vehicle.create({ data: { ...data, status: 'AVAILABLE' } })
  res.status(201).json(vehicle)
}))

router.patch('/vehicles/:id/status', requireRoles('admin'), asyncHandler(async (req, res) => {
  const { status } = req.body || {}
  if (!['AVAILABLE', 'IN_USE', 'MAINTENANCE'].includes(status)) {
    return res.status(400).json({ message: 'status must be AVAILABLE, IN_USE or MAINTENANCE.' })
  }
  const vehicle = await prisma.vehicle.findUnique({ where: { id: req.params.id } })
  if (!vehicle) return res.status(404).json({ message: 'Vehicle not found.' })
  if (vehicle.status === 'IN_USE' && status !== 'IN_USE') {
    const activeRun = await prisma.deliveryRun.findFirst({ where: { vehicleId: vehicle.id, status: 'IN_PROGRESS' } })
    if (activeRun) return res.status(409).json({ message: 'This vehicle is assigned to an active delivery run and cannot be released or moved to maintenance manually.' })
  }
  res.json(await prisma.vehicle.update({ where: { id: vehicle.id }, data: { status } }))
}))

router.get('/runs', requireRoles('admin', 'warehouse_manager', 'delivery_partner'), asyncHandler(async (req, res) => {
  const where = req.user.role.id === 'delivery_partner' ? { deliveryPartnerId: req.user.id } : {}
  res.json(await prisma.deliveryRun.findMany({ where, include: { vehicle: true, deliveryPartner: { select: { fullName: true, email: true } }, shipments: true }, orderBy: { runDate: 'desc' } }))
}))

router.post('/runs', requireRoles('admin'), asyncHandler(async (req, res) => {
  const { route, vehicleId, deliveryPartnerId, runDate } = req.body || {}
  if (!route) return res.status(400).json({ message: 'route is required.' })
  if (runDate && Number.isNaN(new Date(runDate).getTime())) return res.status(400).json({ message: 'runDate must be a valid date.' })
  const run = await prisma.deliveryRun.create({
    data: { runId: makeBusinessId('RUN'), route: String(route).trim(), vehicleId: vehicleId || null, deliveryPartnerId: deliveryPartnerId || null, runDate: runDate ? new Date(runDate) : new Date() },
  })
  res.status(201).json(run)
}))

export default router
