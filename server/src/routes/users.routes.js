import bcrypt from 'bcryptjs'
import { Router } from 'express'
import { prisma } from '../db/prisma.js'
import { asyncHandler } from '../middleware/error.js'
import { authenticate, requireMainAdmin } from '../middleware/auth.js'

const router = Router()
router.use(authenticate, requireMainAdmin)

router.get('/', asyncHandler(async (req, res) => {
  const users = await prisma.user.findMany({
    orderBy: { createdAt: 'desc' },
    select: {
      id: true,
      fullName: true,
      email: true,
      phone: true,
      status: true,
      isMainAdmin: true,
      createdAt: true,
      role: { select: { id: true, name: true, description: true } },
    },
  })
  res.json(users)
}))

router.get('/roles', asyncHandler(async (req, res) => {
  res.json(await prisma.role.findMany({ orderBy: { name: 'asc' } }))
}))

router.post('/', asyncHandler(async (req, res) => {
  const { fullName, email, phone, password, roleId, isMainAdmin = false } = req.body || {}
  if (!fullName || !email || !password || !roleId) return res.status(400).json({ message: 'fullName, email, password and roleId are required.' })

  const normalizedEmail = String(email).trim().toLowerCase()
  const existing = await prisma.user.findUnique({ where: { email: normalizedEmail } })
  if (existing) return res.status(409).json({ message: 'A user with this email already exists.' })

  const role = await prisma.role.findUnique({ where: { id: roleId } })
  if (!role) return res.status(400).json({ message: 'Invalid role.' })

  const passwordHash = await bcrypt.hash(String(password), 12)
  const user = await prisma.user.create({
    data: {
      fullName: String(fullName).trim(),
      email: normalizedEmail,
      phone: phone ? String(phone).trim() : null,
      passwordHash,
      roleId,
      isMainAdmin: Boolean(isMainAdmin),
    },
    include: { role: true },
  })

  res.status(201).json({
    id: user.id,
    fullName: user.fullName,
    email: user.email,
    phone: user.phone,
    status: user.status,
    isMainAdmin: user.isMainAdmin,
    role: user.role,
  })
}))

router.patch('/:id', asyncHandler(async (req, res) => {
  const { fullName, phone, roleId, status, isMainAdmin } = req.body || {}
  const target = await prisma.user.findUnique({ where: { id: req.params.id } })
  if (!target) return res.status(404).json({ message: 'User not found.' })
  if (target.id === req.user.id && status === 'INACTIVE') return res.status(400).json({ message: 'Main Admin cannot deactivate the current session.' })
  if (target.id === req.user.id && isMainAdmin === false) return res.status(400).json({ message: 'Main Admin cannot remove its own main-admin flag.' })

  const updated = await prisma.user.update({
    where: { id: target.id },
    data: {
      ...(fullName !== undefined ? { fullName: String(fullName).trim() } : {}),
      ...(phone !== undefined ? { phone: phone ? String(phone).trim() : null } : {}),
      ...(roleId !== undefined ? { roleId } : {}),
      ...(status !== undefined ? { status } : {}),
      ...(isMainAdmin !== undefined ? { isMainAdmin: Boolean(isMainAdmin) } : {}),
    },
    include: { role: true },
  })
  res.json(updated)
}))

router.patch('/:id/password', asyncHandler(async (req, res) => {
  const password = String(req.body?.password || '')
  if (password.length < 8) return res.status(400).json({ message: 'Password must be at least 8 characters.' })
  const passwordHash = await bcrypt.hash(password, 12)
  await prisma.user.update({ where: { id: req.params.id }, data: { passwordHash } })
  res.json({ message: 'Password updated.' })
}))

export default router
