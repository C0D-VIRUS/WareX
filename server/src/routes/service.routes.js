import { Router } from 'express'
import { prisma } from '../db/prisma.js'
import { asyncHandler } from '../middleware/error.js'
import { authenticate, requireRoles } from '../middleware/auth.js'
import { notify, notifyUsersByRole } from '../utils/notify.js'

const router = Router()

router.use(authenticate)

const visitInclude = {
  technician: {
    select: {
      id: true,
      fullName: true,
      email: true,
    },
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
        include: {
          items: {
            include: {
              sku: true,
            },
          },
        },
      },
    },
  },
}

const allowedStatuses = [
  'ASSIGNED',
  'VISIT_ACCEPTED',
  'INSPECTED',
  'ASSEMBLY_COMPLETED',
  'DEFECT_FOUND',
  'REPAIR_COMPLETED',
  'COMPLETED',
]

const transitions = {
  ASSIGNED: ['VISIT_ACCEPTED'],
  VISIT_ACCEPTED: ['INSPECTED'],
  INSPECTED: [
    'ASSEMBLY_COMPLETED',
    'DEFECT_FOUND',
    'COMPLETED',
  ],
  ASSEMBLY_COMPLETED: [
    'DEFECT_FOUND',
    'COMPLETED',
  ],
  DEFECT_FOUND: ['REPAIR_COMPLETED'],
  REPAIR_COMPLETED: [
    'ASSEMBLY_COMPLETED',
    'COMPLETED',
  ],
  COMPLETED: [],
}

// =====================================================
// LIST SERVICE VISITS
// Admin sees all visits. Technicians see only their own.
// =====================================================

router.get(
  '/',
  requireRoles('admin', 'technician'),
  asyncHandler(async (req, res) => {
    const where =
      req.user.role.id === 'technician'
        ? { technicianId: req.user.id }
        : {}

    const visits = await prisma.serviceVisit.findMany({
      where,
      include: visitInclude,
      orderBy: { createdAt: 'desc' },
    })

    res.json(visits)
  })
)

// =====================================================
// UPDATE A SERVICE VISIT
//
// Workflow:
// ASSIGNED -> VISIT_ACCEPTED -> INSPECTED
// -> ASSEMBLY_COMPLETED, when assembly is required
// -> DEFECT_FOUND -> REPAIR_COMPLETED, when a defect exists
// -> COMPLETED, after required work and report
// =====================================================

router.patch(
  '/:id',
  requireRoles('technician'),
  asyncHandler(async (req, res) => {
    const existing = await prisma.serviceVisit.findUnique({
      where: { id: req.params.id },
      include: visitInclude,
    })

    if (!existing) {
      return res.status(404).json({
        message: 'Service visit not found.',
      })
    }

    // A technician can only update their own assigned visits.
    if (existing.technicianId !== req.user.id) {
      return res.status(403).json({
        message: 'This service visit is not assigned to you.',
      })
    }

    if (existing.status === 'COMPLETED') {
      return res.status(409).json({
        message: 'This service visit is already completed.',
      })
    }

    const nextStatus = req.body?.status

    if (!nextStatus || !allowedStatuses.includes(nextStatus)) {
      return res.status(400).json({
        message: 'A valid service status is required.',
        allowedStatuses,
      })
    }

    if (!transitions[existing.status]?.includes(nextStatus)) {
      return res.status(409).json({
        message:
          `Cannot move a visit from ${existing.status} to ${nextStatus}.`,
        currentStatus: existing.status,
        allowedNextStatuses: transitions[existing.status] || [],
      })
    }

    let assemblyRequired = existing.assemblyRequired
    let defectFound = existing.defectFound
    let notes = existing.notes

    // The report text is stored in the existing notes field.
    if (req.body?.notes !== undefined) {
      if (typeof req.body.notes !== 'string') {
        return res.status(400).json({
          message: 'Service notes must be text.',
        })
      }

      notes = req.body.notes.trim() || null
    }

    // Assembly can only be completed when it was required.
    if (nextStatus === 'ASSEMBLY_COMPLETED') {
      if (!existing.assemblyRequired) {
        return res.status(409).json({
          message:
            'Assembly is not marked as required for this service visit.',
        })
      }

      assemblyRequired = false
    }

    // A defect must be explicitly recorded.
    if (nextStatus === 'DEFECT_FOUND') {
      defectFound = true
    }

    // Repair completion clears the outstanding defect flag.
    if (nextStatus === 'REPAIR_COMPLETED') {
      if (!existing.defectFound) {
        return res.status(409).json({
          message:
            'Record a defect before marking repair as completed.',
        })
      }

      defectFound = false
    }

    // Prevent premature completion.
    if (nextStatus === 'COMPLETED') {
      if (assemblyRequired) {
        return res.status(409).json({
          message:
            'Assembly is still required. Complete assembly before closing the visit.',
        })
      }

      if (defectFound) {
        return res.status(409).json({
          message:
            'An unresolved defect remains. Complete the repair before closing the visit.',
        })
      }

      if (!notes) {
        return res.status(400).json({
          message:
            'Submit a non-empty service report before completing the visit.',
        })
      }
    }

    // Save the visit and its complaint status together.
    const updated = await prisma.$transaction(async (tx) => {
      const visit = await tx.serviceVisit.update({
        where: { id: existing.id },
        data: {
          status: nextStatus,
          assemblyRequired,
          defectFound,
          notes,
          ...(nextStatus === 'COMPLETED'
            ? { completedAt: new Date() }
            : {}),
        },
        include: visitInclude,
      })

      if (
        nextStatus === 'VISIT_ACCEPTED' ||
        nextStatus === 'INSPECTED'
      ) {
        await tx.complaint.update({
          where: { id: existing.complaintId },
          data: { status: 'IN_PROGRESS' },
        })
      }

      if (nextStatus === 'COMPLETED') {
        await tx.complaint.update({
          where: { id: existing.complaintId },
          data: { status: 'RESOLVED' },
        })
      }

      return visit
    })

    const readableStatus = nextStatus
      .toLowerCase()
      .replaceAll('_', ' ')

    // Notify the customer about the service visit's progress.
    await notify(
      existing.complaint.customerId,
      'SERVICE',
      `Service visit ${updated.visitId} is now ${readableStatus}.`
    )

    // Alert Admin when the technician discovers a defect.
    if (nextStatus === 'DEFECT_FOUND') {
      await notifyUsersByRole(
        'admin',
        'SERVICE',
        `Technician ${req.user.fullName} reported a defect during service visit ${updated.visitId}. Repair is required.`
      )
    }

    // Notify Admin when the service case is complete.
    if (nextStatus === 'COMPLETED') {
      await notifyUsersByRole(
        'admin',
        'SERVICE',
        `Service visit ${updated.visitId} is completed. Complaint ${updated.complaint.complaintId} has been resolved.`
      )
    }

    res.json({
      ...updated,
      workflow: {
        currentStatus: updated.status,
        allowedNextStatuses: transitions[updated.status] || [],
      },
    })
  })
)

export default router