import { prisma } from '../db/prisma.js'
import { makeBusinessId } from './ids.js'

export async function notify(recipientId, type, message) {
  if (!recipientId) return null
  return prisma.notification.create({
    data: {
      notificationId: makeBusinessId('N'),
      type,
      message,
      recipientId,
    },
  })
}

export async function notifyUsersByRole(roleId, type, message) {
  const users = await prisma.user.findMany({
    where: { roleId, status: 'ACTIVE' },
    select: { id: true },
  })
  if (!users.length) return 0
  await prisma.notification.createMany({
    data: users.map((user) => ({
      notificationId: makeBusinessId('N'),
      type,
      message,
      recipientId: user.id,
    })),
  })
  return users.length
}
