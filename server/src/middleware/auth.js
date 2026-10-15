import jwt from 'jsonwebtoken'
import { env } from '../config/env.js'
import { prisma } from '../db/prisma.js'

export async function authenticate(req, res, next) {
  try {
    const header = req.headers.authorization || ''
    const token = header.startsWith('Bearer ')
      ? header.slice(7)
      : null

    if (!token) {
      return res.status(401).json({
        message: 'Authentication required.',
      })
    }

    const payload = jwt.verify(token, env.jwtSecret)

    const user = await prisma.user.findUnique({
      where: { id: payload.sub },
      include: { role: true },
    })

    if (!user || user.status !== 'ACTIVE') {
      return res.status(401).json({
        message: 'Account is inactive or unavailable.',
      })
    }

    req.user = user
    next()
  } catch (error) {
    console.error('[WAREX AUTHENTICATION ERROR]', error.message)

    return res.status(401).json({
      message: 'Invalid or expired authentication token.',
    })
  }
}

export function requireRoles(...roles) {
  return (req, res, next) => {
    if (!req.user || !roles.includes(req.user.role.id)) {
      console.error('[WAREX AUTHORIZATION DENIED]', {
        method: req.method,
        path: req.originalUrl,
        email: req.user?.email ?? 'No authenticated user',
        actualRoleId: req.user?.role?.id ?? 'No role',
        actualRoleName: req.user?.role?.name ?? 'No role name',
        allowedRoles: roles,
      })

      return res.status(403).json({
        message: 'You do not have permission for this action.',
      })
    }

    next()
  }
}

export function requireMainAdmin(req, res, next) {
  if (!req.user?.isMainAdmin) {
    console.error('[WAREX MAIN ADMIN PERMISSION DENIED]', {
      email: req.user?.email ?? 'No authenticated user',
      roleId: req.user?.role?.id ?? 'No role',
      isMainAdmin: req.user?.isMainAdmin ?? false,
      method: req.method,
      path: req.originalUrl,
    })

    return res.status(403).json({
      message: 'Main Admin permission required.',
    })
  }

  next()
}

export function signToken(user) {
  return jwt.sign(
    {
      roleId: user.role.id,
      email: user.email,
      isMainAdmin: user.isMainAdmin,
    },
    env.jwtSecret,
    {
      subject: user.id,
      expiresIn: '8h',
    },
  )
}