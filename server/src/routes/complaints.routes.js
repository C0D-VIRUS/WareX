import { Router } from 'express'
import { prisma } from '../db/prisma.js'
import { asyncHandler } from '../middleware/error.js'
import { authenticate, requireRoles } from '../middleware/auth.js'
import { makeBusinessId } from '../utils/ids.js'
import { notify, notifyUsersByRole } from '../utils/notify.js'

const router = Router()

router.use(authenticate)

const technicianFields = {
  id: true,
  fullName: true,
  email: true,
  status: true,
}

const complaintIncludes = {
  customer: {
    select: {
      id: true,
      fullName: true,
      email: true,
    },
  },
  order: {
    select: {
      id: true,
      orderNumber: true,
      status: true,
    },
  },
  serviceVisit: {
    include: {
      technician: {
        select: technicianFields,
      },
    },
  },
}

// =====================================================
// LIST COMPLAINTS
// Admin sees all complaints; customers see only their own.
// Includes technician details for the Admin dashboard.
// =====================================================

router.get(
  '/',
  requireRoles('admin', 'business_customer'),
  asyncHandler(async (req, res) => {
    const where =
      req.user.role.id === 'business_customer'
        ? { customerId: req.user.id }
        : {}

    const complaints = await prisma.complaint.findMany({
      where,
      include: complaintIncludes,
      orderBy: { createdAt: 'desc' },
    })

    res.json(complaints)
  })
)

// =====================================================
// REGISTER A COMPLAINT
// POST /api/complaints
// =====================================================

router.post(
  '/',
  requireRoles('business_customer', 'admin'),
  asyncHandler(async (req, res) => {
    const customerId =
      req.user.role.id === 'business_customer'
        ? req.user.id
        : req.body?.customerId

    const complaintType = String(
      req.body?.complaintType || ''
    ).trim()

    const description = String(
      req.body?.description || ''
    ).trim()

    const priority = String(
      req.body?.priority || 'NORMAL'
    ).toUpperCase()

    const orderId = req.body?.orderId || null

    if (!customerId || !complaintType || !description) {
      return res.status(400).json({
        message:
          'customerId, complaintType and description are required.',
      })
    }

    if (!['LOW', 'NORMAL', 'HIGH', 'URGENT'].includes(priority)) {
      return res.status(400).json({
        message: 'Priority must be LOW, NORMAL, HIGH or URGENT.',
      })
    }

    const customer = await prisma.user.findUnique({
      where: { id: customerId },
      include: { role: true },
    })

    if (
      !customer ||
      customer.status !== 'ACTIVE' ||
      customer.role.id !== 'business_customer'
    ) {
      return res.status(400).json({
        message: 'An active Business Customer account is required.',
      })
    }

    // If an order is linked, verify that it belongs to this customer.
    if (orderId) {
      const order = await prisma.order.findUnique({
        where: { id: orderId },
        select: {
          id: true,
          customerId: true,
        },
      })

      if (!order) {
        return res.status(404).json({
          message: 'Related order not found.',
        })
      }

      if (order.customerId !== customerId) {
        return res.status(403).json({
          message: 'The selected order does not belong to this customer.',
        })
      }
    }

    const complaint = await prisma.complaint.create({
      data: {
        complaintId: makeBusinessId('CMP'),
        customerId,
        orderId,
        complaintType,
        description,
        priority,
      },
      include: complaintIncludes,
    })

    await notifyUsersByRole(
      'admin',
      'COMPLAINT',
      `Complaint ${complaint.complaintId} has been registered and requires review.`
    )

    res.status(201).json({
      ...complaint,
      routing: {
        recipientRoleId: 'admin',
        recipientRole: 'Main Admin',
      },
    })
  })
)

// =====================================================
// ASSIGN OR REASSIGN A TECHNICIAN
// POST /api/complaints/:id/assign-technician
//
// Reassignment is permitted only before a technician has
// accepted or started the service visit.
// =====================================================

router.post(
  '/:id/assign-technician',
  requireRoles('admin'),
  asyncHandler(async (req, res) => {
    const technicianId = req.body?.technicianId

    if (!technicianId) {
      return res.status(400).json({
        message: 'technicianId is required.',
      })
    }

    const technician = await prisma.user.findUnique({
      where: { id: technicianId },
      include: { role: true },
    })

    if (
      !technician ||
      technician.role.id !== 'technician' ||
      technician.status !== 'ACTIVE'
    ) {
      return res.status(400).json({
        message: 'Choose an active Technician account.',
      })
    }

    const complaint = await prisma.complaint.findUnique({
      where: { id: req.params.id },
      include: {
        customer: {
          select: {
            id: true,
            fullName: true,
            email: true,
          },
        },
        serviceVisit: {
          include: {
            technician: {
              select: technicianFields,
            },
          },
        },
      },
    })

    if (!complaint) {
      return res.status(404).json({
        message: 'Complaint not found.',
      })
    }

    if (['RESOLVED', 'CLOSED'].includes(complaint.status)) {
      return res.status(409).json({
        message: 'A resolved or closed complaint cannot be assigned.',
      })
    }

    const currentVisit = complaint.serviceVisit

    if (currentVisit && currentVisit.status !== 'ASSIGNED') {
      return res.status(409).json({
        message:
          'This service visit has already been accepted or started. Reassignment is not allowed while work is in progress.',
      })
    }

    const previousTechnician = currentVisit?.technician || null

    const isReassignment = Boolean(
      previousTechnician &&
      previousTechnician.id !== technician.id
    )

    let scheduledDate

    if (req.body?.scheduledDate) {
      scheduledDate = new Date(req.body.scheduledDate)

      if (Number.isNaN(scheduledDate.getTime())) {
        return res.status(400).json({
          message: 'scheduledDate must be a valid date and time.',
        })
      }
    }

    // Update complaint and service visit together.
    const visit = await prisma.$transaction(async (tx) => {
      await tx.complaint.update({
        where: { id: complaint.id },
        data: { status: 'ASSIGNED' },
      })

      return tx.serviceVisit.upsert({
        where: {
          complaintId: complaint.id,
        },

        update: {
          technicianId: technician.id,
          status: 'ASSIGNED',
          completedAt: null,
          ...(scheduledDate ? { scheduledDate } : {}),
        },

        create: {
          visitId: makeBusinessId('SV'),
          complaintId: complaint.id,
          technicianId: technician.id,
          visitType: String(
            req.body?.visitType || 'AFTER_SALES_SERVICE'
          ),
          ...(scheduledDate ? { scheduledDate } : {}),
        },

        include: {
          technician: {
            select: technicianFields,
          },
          complaint: {
            include: {
              customer: {
                select: {
                  id: true,
                  fullName: true,
                  email: true,
                },
              },
              order: {
                select: {
                  id: true,
                  orderNumber: true,
                  status: true,
                },
              },
            },
          },
        },
      })
    })

    // Notify the previous technician when reassignment occurs.
    if (isReassignment) {
      await notify(
        previousTechnician.id,
        'SERVICE',
        `Service visit ${visit.visitId} for complaint ${complaint.complaintId} has been reassigned to another technician.`
      )
    }

    // Notify the newly assigned technician.
    if (!previousTechnician || isReassignment) {
      await notify(
        technician.id,
        'SERVICE',
        `Service visit ${visit.visitId} has been assigned to you for complaint ${complaint.complaintId}. Review the visit and accept it before starting work.`
      )
    }

    // Keep the customer informed.
    await notify(
      complaint.customerId,
      'SERVICE',
      isReassignment
        ? `The technician for complaint ${complaint.complaintId} has changed. Your new assigned technician is ${technician.fullName}.`
        : `Technician ${technician.fullName} has been assigned to complaint ${complaint.complaintId}.`
    )

    res.json({
      ...visit,
      routing: {
        recipientRoleId: 'technician',
        recipientRole: 'Technician',
        recipientName: technician.fullName,
        recipientEmail: technician.email,
        reassigned: isReassignment,
      },
    })
  })
)

// =====================================================
// UPDATE COMPLAINT STATUS
// PATCH /api/complaints/:id/status
//
// Prevents the Admin from closing a complaint while its
// service visit still has unfinished work.
// =====================================================

router.patch(
  '/:id/status',
  requireRoles('admin'),
  asyncHandler(async (req, res) => {
    const status = String(
      req.body?.status || ''
    ).toUpperCase()

    const allowed = [
      'OPEN',
      'ASSIGNED',
      'IN_PROGRESS',
      'RESOLVED',
      'CLOSED',
    ]

    if (!allowed.includes(status)) {
      return res.status(400).json({
        message: 'Invalid complaint status.',
      })
    }

    const existing = await prisma.complaint.findUnique({
      where: { id: req.params.id },
      include: { serviceVisit: true },
    })

    if (!existing) {
      return res.status(404).json({
        message: 'Complaint not found.',
      })
    }

    if (status === 'ASSIGNED' && !existing.serviceVisit) {
      return res.status(409).json({
        message:
          'Assign a technician before marking the complaint as assigned.',
      })
    }

    if (
      ['RESOLVED', 'CLOSED'].includes(status) &&
      existing.serviceVisit &&
      existing.serviceVisit.status !== 'COMPLETED'
    ) {
      return res.status(409).json({
        message:
          'This complaint has an unfinished service visit. The technician must complete the required work and submit a report first.',
      })
    }

    const complaint = await prisma.complaint.update({
      where: { id: existing.id },
      data: { status },
      include: complaintIncludes,
    })

    await notify(
      complaint.customerId,
      'COMPLAINT',
      `Complaint ${complaint.complaintId} is now ${status
        .toLowerCase()
        .replaceAll('_', ' ')}.`
    )

    res.json(complaint)
  })
)

export default router