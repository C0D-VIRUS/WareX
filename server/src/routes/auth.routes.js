import bcrypt from 'bcryptjs'
import { Router } from 'express'
import { prisma } from '../db/prisma.js'
import { authenticate, signToken } from '../middleware/auth.js'
import { asyncHandler } from '../middleware/error.js'

const router = Router()

router.post('/login', asyncHandler(async (req, res) => {
  const email = String(req.body?.email || '').trim().toLowerCase()
  const password = String(req.body?.password || '')

  const user = await prisma.user.findUnique({
    where: { email },
    include: { role: true },
  })

  if (!user || user.status !== 'ACTIVE' || !(await bcrypt.compare(password, user.passwordHash))) {
    return res.status(401).json({ message: 'Invalid email or password.' })
  }

  const token = signToken(user)
  res.json({
    token,
    user: {
      id: user.id,
      fullName: user.fullName,
      email: user.email,
      phone: user.phone,
      roleId: user.role.id,
      roleName: user.role.name,
      isMainAdmin: user.isMainAdmin,
    },
  })
}))

router.get('/me', authenticate, asyncHandler(async (req, res) => {
  res.json({
    id: req.user.id,
    fullName: req.user.fullName,
    email: req.user.email,
    phone: req.user.phone,
    roleId: req.user.role.id,
    roleName: req.user.role.name,
    isMainAdmin: req.user.isMainAdmin,
  })
}))

export default router
