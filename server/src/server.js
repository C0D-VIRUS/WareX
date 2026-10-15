import app from './app.js'
import { env } from './config/env.js'
import { prisma } from './db/prisma.js'

const server = app.listen(env.port, () => {
  console.log(`WAREX API running on http://localhost:${env.port}`)
})

async function shutdown(signal) {
  console.log(`\n${signal} received. Shutting down WAREX API...`)
  server.close(async () => {
    await prisma.$disconnect()
    process.exit(0)
  })
}

process.on('SIGINT', () => shutdown('SIGINT'))
process.on('SIGTERM', () => shutdown('SIGTERM'))
