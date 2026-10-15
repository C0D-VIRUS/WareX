import path from 'node:path'
import { randomUUID } from 'node:crypto'
import { mkdir } from 'node:fs/promises'
import multer from 'multer'
import { Router } from 'express'

import { prisma } from '../db/prisma.js'
import { asyncHandler } from '../middleware/error.js'
import { authenticate, requireRoles } from '../middleware/auth.js'
import { env } from '../config/env.js'
import { makeBusinessId } from '../utils/ids.js'
import { notify, notifyUsersByRole } from '../utils/notify.js'
import {
  selectSuitableVehicle,
  validatePackageDetails,
} from '../utils/vehicle-selection.js'

const router = Router()

router.use(authenticate)

const upload = multer({
  dest: path.resolve(env.uploadDir),
  limits: { fileSize: 5 * 1024 * 1024 },
})

// =====================================================
// GET SHIPMENTS
// =====================================================

router.get(
  '/',
  requireRoles('admin', 'warehouse_manager', 'delivery_partner', 'business_customer'),
  asyncHandler(async (req, res) => {
    const where = {}

    if (req.user.role.id === 'delivery_partner') {
      where.deliveryPartnerId = req.user.id
    }

    if (req.user.role.id === 'business_customer') {
      where.order = { customerId: req.user.id }
    }

    const shipments = await prisma.shipment.findMany({
      where,
      include: {
        order: {
          include: {
            customer: {
              select: {
                fullName: true,
                email: true,
              },
            },
            warehouse: true,
            items: {
              include: { sku: true },
            },
          },
        },
        deliveryPartner: {
          select: {
            id: true,
            fullName: true,
            email: true,
          },
        },
        deliveryRun: {
          include: { vehicle: true },
        },
        proofOfDelivery: { select: { id: true, podId: true, podType: true, capturedAt: true } },
      },
      orderBy: { createdAt: 'desc' },
    })

    res.json(shipments)
  })
)

// =====================================================
// CREATE SHIPMENT + SELECT A SUITABLE VEHICLE
// POST /api/shipments/from-order/:orderId
// =====================================================

router.post(
  '/from-order/:orderId',
  requireRoles('admin', 'warehouse_manager'),
  asyncHandler(async (req, res) => {
    // Step 1: Validate package measurements.
    const validation = validatePackageDetails(req.body || {})

    if (!validation.valid) {
      return res.status(400).json({
        message: validation.message,
        requiredFields: [
          'packageWeightKg',
          'packageLengthCm',
          'packageWidthCm',
          'packageHeightCm',
          'estimatedDistanceKm',
        ],
      })
    }

    const packageDetails = validation.details

    // Step 2: Retrieve the order.
    const order = await prisma.order.findUnique({
      where: { id: req.params.orderId },
      include: { shipment: true },
    })

    if (!order) {
      return res.status(404).json({
        message: 'Order not found.',
      })
    }

    if (order.shipment) {
      return res.status(409).json({
        message: 'A shipment already exists for this order.',
      })
    }

    if (!['PACKED', 'PROCESSED'].includes(order.status)) {
      return res.status(400).json({
        message: 'The order must be packed before shipment creation.',
      })
    }

    // Step 3: Retrieve available vehicles.
    const availableVehicles = await prisma.vehicle.findMany({
      where: { status: 'AVAILABLE' },
    })

    // Step 4: Find the smallest suitable vehicle class and rank
    // suitable vehicles by estimated operating cost, energy use,
    // and travel time.
    const selection = selectSuitableVehicle(
      availableVehicles,
      packageDetails
    )

    if (!selection.success) {
      return res.status(422).json({
        message: selection.message,
        vehicleRecommendation: null,
      })
    }

    const chosen = selection.recommendedVehicle

    const shipmentNumber = makeBusinessId('SHP')
    const trackingNumber = makeBusinessId('TRK')
    const runId = makeBusinessId('RUN')

    // Calculate an indicative ETA from the selected vehicle's speed.
    // The additional 30 minutes is a planning allowance, not a
    // live traffic or route prediction.
    const calculatedEta = new Date(
      Date.now() +
        Math.ceil(chosen.estimatedTravelHours * 60 + 30) *
          60 *
          1000
    )

    const eta = req.body?.eta
      ? new Date(req.body.eta)
      : calculatedEta

    if (Number.isNaN(eta.getTime())) {
      return res.status(400).json({
        message: 'Please provide a valid estimated delivery time.',
      })
    }

    // Step 5: Atomically claim the vehicle and create the shipment
    // and delivery run. This prevents two requests from claiming
    // the same available vehicle at the same time.
    const result = await prisma.$transaction(async (tx) => {
      const claimed = await tx.vehicle.updateMany({
        where: {
          id: chosen.id,
          status: 'AVAILABLE',
        },
        data: { status: 'IN_USE' },
      })

      if (claimed.count !== 1) {
        return { conflict: true }
      }

      const deliveryRun = await tx.deliveryRun.create({
        data: {
          runId,
          route: `Warehouse ${order.warehouseId} to customer ${order.customerId}`,
          vehicleId: chosen.id,
          runDate: new Date(),
        },
      })

      const shipment = await tx.shipment.create({
        data: {
          shipmentNumber,
          trackingNumber,
          shipmentDate: new Date(),
          status: 'CREATED',
          orderId: order.id,
          deliveryRunId: deliveryRun.id,

          packageWeightKg: packageDetails.packageWeightKg,
          packageLengthCm: packageDetails.packageLengthCm,
          packageWidthCm: packageDetails.packageWidthCm,
          packageHeightCm: packageDetails.packageHeightCm,
          estimatedDistanceKm: packageDetails.estimatedDistanceKm,

          eta,
        },
        include: {
          order: true,
          deliveryRun: {
            include: { vehicle: true },
          },
        },
      })

      await tx.order.update({
        where: { id: order.id },
        data: { status: 'PROCESSED' },
      })

      return { shipment }
    })

    if (result.conflict) {
      return res.status(409).json({
        message:
          'The selected vehicle is no longer available. Please try again.',
      })
    }

    const shipment = result.shipment

    // Step 6: Notify delivery partners and the customer.
    await notifyUsersByRole(
      'delivery_partner',
      'SHIPMENT',
      `Shipment ${shipment.shipmentNumber} is ready for delivery assignment. Selected vehicle: ${chosen.vehicleType} (${chosen.registrationNo}).`
    )

    await notify(
      order.customerId,
      'SHIPMENT',
      `Shipment ${shipment.shipmentNumber} has been created. Estimated delivery: ${eta.toLocaleString()}.`
    )

    return res.status(201).json({
      ...shipment,

      vehicleRecommendation: {
        vehicleId: chosen.id,
        registrationNo: chosen.registrationNo,
        vehicleType: chosen.vehicleType,
        estimatedOperatingCost: chosen.estimatedOperatingCost,
        estimatedEnergyUse: chosen.estimatedEnergyUse,
        estimatedTravelHours: chosen.estimatedTravelHours,
        selectionScore: chosen.selectionScore,
      },

      routing: {
        recipientRoleId: 'delivery_partner',
        recipientRole: 'Delivery Partner',
      },
    })
  })
)

// =====================================================
// ASSIGN SHIPMENT TO DELIVERY PARTNER
// POST /api/shipments/:id/assign
// =====================================================

router.post(
  '/:id/assign',
  requireRoles('admin', 'warehouse_manager'),
  asyncHandler(async (req, res) => {
    const deliveryPartner = await prisma.user.findUnique({
      where: {
        id: req.body?.deliveryPartnerId,
      },
      include: { role: true },
    })

    if (
      !deliveryPartner ||
      deliveryPartner.status !== 'ACTIVE' ||
      deliveryPartner.role.id !== 'delivery_partner'
    ) {
      return res.status(400).json({
        message: 'A valid Delivery Partner is required.',
      })
    }

    const existing = await prisma.shipment.findUnique({
      where: { id: req.params.id },
      include: {
        order: true,
        deliveryRun: true,
        proofOfDelivery: true,
      },
    })

    if (!existing) {
      return res.status(404).json({
        message: 'Shipment not found.',
      })
    }

    if (['DELIVERED', 'CLOSED'].includes(existing.status)) {
      return res.status(400).json({
        message: 'A completed shipment cannot be assigned.',
      })
    }

    const shipment = await prisma.$transaction(async (tx) => {
      const updated = await tx.shipment.update({
        where: { id: existing.id },
        data: {
          deliveryPartnerId: deliveryPartner.id,
          status: 'ASSIGNED',
        },
        include: {
          order: true,
          deliveryPartner: {
            select: {
              id: true,
              fullName: true,
              email: true,
            },
          },
          deliveryRun: {
            include: { vehicle: true },
          },
        },
      })

      if (existing.deliveryRunId) {
        await tx.deliveryRun.update({
          where: { id: existing.deliveryRunId },
          data: {
            deliveryPartnerId: deliveryPartner.id,
          },
        })
      }

      return updated
    })

    await notify(
      deliveryPartner.id,
      'DELIVERY',
      `Shipment ${shipment.shipmentNumber} has been assigned to you.`
    )

    await notify(
      shipment.order.customerId,
      'SHIPMENT',
      `Shipment ${shipment.shipmentNumber} has been assigned for delivery.`
    )

    res.json({
      ...shipment,
      routing: {
        recipientRoleId: 'delivery_partner',
        recipientRole: 'Delivery Partner',
        recipientName: shipment.deliveryPartner.fullName,
        recipientEmail: shipment.deliveryPartner.email,
      },
    })
  })
)

// =====================================================
// UPDATE SHIPMENT STATUS
// PATCH /api/shipments/:id/status
// =====================================================

router.patch(
  '/:id/status',
  requireRoles('admin', 'warehouse_manager', 'delivery_partner'),
  asyncHandler(async (req, res) => {
    const nextStatus = req.body?.status

    const allowedStatuses = [
      'CREATED',
      'ASSIGNED',
      'IN_TRANSIT',
      'DELIVERED',
      'CLOSED',
    ]

    if (!allowedStatuses.includes(nextStatus)) {
      return res.status(400).json({
        message: 'Invalid shipment status.',
      })
    }

    const existing = await prisma.shipment.findUnique({
      where: { id: req.params.id },
      include: {
        order: true,
        deliveryRun: true,
        proofOfDelivery: true,
      },
    })

    if (!existing) {
      return res.status(404).json({
        message: 'Shipment not found.',
      })
    }

    if (
      req.user.role.id === 'delivery_partner' &&
      existing.deliveryPartnerId !== req.user.id
    ) {
      return res.status(403).json({
        message: 'This shipment is not assigned to you.',
      })
    }

    if (
      ['DELIVERED', 'CLOSED'].includes(existing.status) &&
      nextStatus !== existing.status
    ) {
      return res.status(400).json({
        message: 'A completed shipment cannot change status.',
      })
    }

    if (['CREATED', 'ASSIGNED'].includes(nextStatus)) {
      return res.status(400).json({ message: 'Use the shipment assignment action to assign a delivery partner.' })
    }

    if (nextStatus === 'IN_TRANSIT' && existing.status !== 'ASSIGNED') {
      return res.status(400).json({ message: 'A shipment must be assigned to a delivery partner before dispatch.' })
    }

    if (nextStatus === 'DELIVERED') {
      if (existing.status !== 'IN_TRANSIT') {
        return res.status(400).json({ message: 'A shipment must be out for delivery before it can be marked delivered.' })
      }
      if (!existing.proofOfDelivery) {
        return res.status(400).json({ message: 'Proof of delivery must be recorded before completing the shipment.' })
      }
    }

    if (nextStatus === 'CLOSED' && existing.status !== 'DELIVERED') {
      return res.status(400).json({ message: 'Only a delivered shipment can be closed.' })
    }

    const shipment = await prisma.$transaction(async (tx) => {
      const updatedShipment = await tx.shipment.update({
        where: { id: existing.id },
        data: { status: nextStatus },
        include: {
          order: {
            include: { items: true },
          },
          deliveryRun: {
            include: { vehicle: true },
          },
        },
      })

      // Dispatch: update order status and release reserved-stock
      // counters. Available quantity was already deducted during
      // stock reservation.
      if (nextStatus === 'IN_TRANSIT') {
        await tx.order.update({
          where: { id: existing.orderId },
          data: { status: 'SHIPPED' },
        })

        for (const item of updatedShipment.order.items) {
          const inventory = await tx.inventory.findUnique({
            where: {
              warehouseId_skuId: {
                warehouseId: updatedShipment.order.warehouseId,
                skuId: item.skuId,
              },
            },
          })

          if (!inventory) continue

          const released = Math.min(
            inventory.reserved,
            item.quantity
          )

          if (released > 0) {
            await tx.inventory.update({
              where: { id: inventory.id },
              data: {
                reserved: { decrement: released },
              },
            })

            await tx.stockTransaction.create({
              data: {
                transactionId: randomUUID(),
                type: 'SHIP',
                quantity: released,
                referenceNo: updatedShipment.shipmentNumber,
                note: 'Dispatched against a packed order',
                warehouseId: inventory.warehouseId,
                skuId: inventory.skuId,
              },
            })
          }
        }

        if (existing.deliveryRunId) {
          await tx.deliveryRun.update({
            where: { id: existing.deliveryRunId },
            data: { status: 'IN_PROGRESS' },
          })
        }
      }

      if (nextStatus === 'DELIVERED' || nextStatus === 'CLOSED') {
        await tx.order.update({
          where: { id: existing.orderId },
          data: {
            status:
              nextStatus === 'DELIVERED'
                ? 'DELIVERED'
                : 'CLOSED',
          },
        })

        // Release the vehicle after the delivery run finishes.
        if (existing.deliveryRunId) {
          await tx.deliveryRun.update({
            where: { id: existing.deliveryRunId },
            data: { status: 'COMPLETED' },
          })

          const vehicleId =
            updatedShipment.deliveryRun?.vehicleId

          if (vehicleId) {
            await tx.vehicle.updateMany({
              where: {
                id: vehicleId,
                status: 'IN_USE',
              },
              data: { status: 'AVAILABLE' },
            })
          }
        }
      }

      return updatedShipment
    })

    await notify(
      existing.order.customerId,
      'DELIVERY',
      `Shipment ${shipment.shipmentNumber} is now ${nextStatus
        .replaceAll('_', ' ')
        .toLowerCase()}.`
    )

    res.json(shipment)
  })
)

// =====================================================
// RECORD PROOF OF DELIVERY
// POST /api/shipments/:id/proof
// =====================================================

router.post(
  '/:id/proof',
  requireRoles('admin', 'delivery_partner'),
  upload.single('file'),
  asyncHandler(async (req, res) => {
    const shipment = await prisma.shipment.findUnique({
      where: { id: req.params.id },
      include: { order: true },
    })

    if (!shipment) {
      return res.status(404).json({
        message: 'Shipment not found.',
      })
    }

    if (
      req.user.role.id === 'delivery_partner' &&
      shipment.deliveryPartnerId !== req.user.id
    ) {
      return res.status(403).json({
        message: 'This shipment is not assigned to you.',
      })
    }

    if (!['ASSIGNED', 'IN_TRANSIT'].includes(shipment.status)) {
      return res.status(400).json({ message: 'Proof can only be recorded for an assigned or in-transit shipment.' })
    }

    const reference = req.file ? req.file.path : String(req.body?.reference || '').trim() || null
    const notes = String(req.body?.notes || '').trim() || null
    if (!req.file && !reference && !notes) {
      return res.status(400).json({ message: 'Provide a proof reference, notes, or upload a document.' })
    }

    await mkdir(path.resolve(env.uploadDir), {
      recursive: true,
    })

    const pod = await prisma.proofOfDelivery.upsert({
      where: { shipmentId: shipment.id },

      update: {
        podType: req.body?.podType || 'DOCUMENT',
        reference,
        notes,
        capturedAt: new Date(),
      },

      create: {
        podId: makeBusinessId('POD'),
        shipmentId: shipment.id,
        podType: req.body?.podType || 'DOCUMENT',
        reference,
        notes,
      },
    })

    await notify(
      shipment.order.customerId,
      'DELIVERY',
      `Proof of delivery has been recorded for ${shipment.shipmentNumber}.`
    )

    res.status(201).json(pod)
  })
)

export default router