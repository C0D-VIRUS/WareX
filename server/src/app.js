import path from 'node:path'
import express from 'express'
import cors from 'cors'
import helmet from 'helmet'
import morgan from 'morgan'
import { mkdir } from 'node:fs/promises'
import { env } from './config/env.js'
import { prisma } from './db/prisma.js'
import { errorHandler, notFound } from './middleware/error.js'
import authRoutes from './routes/auth.routes.js'
import userRoutes from './routes/users.routes.js'
import catalogRoutes from './routes/catalog.routes.js'
import orderRoutes from './routes/orders.routes.js'
import shipmentRoutes from './routes/shipments.routes.js'
import restockRoutes from './routes/restocks.routes.js'
import complaintRoutes from './routes/complaints.routes.js'
import serviceRoutes from './routes/service.routes.js'
import returnRoutes from './routes/returns.routes.js'
import notificationRoutes from './routes/notifications.routes.js'
import fleetRoutes from './routes/fleet.routes.js'
import transferRoutes from './routes/transfers.routes.js'

await mkdir(path.resolve(env.uploadDir), { recursive: true })

const app = express()
app.use(helmet())
app.use(cors({ origin: env.clientUrl, credentials: false }))
app.use(express.json({ limit: '2mb' }))
app.use(express.urlencoded({ extended: true }))
app.use(morgan('dev'))

app.get('/api/health', async (req, res) => {
  await prisma.$queryRaw`SELECT 1`
  res.json({ ok: true, service: 'WAREX API', timestamp: new Date().toISOString() })
})

app.use('/api/auth', authRoutes)
app.use('/api/users', userRoutes)
app.use('/api/catalog', catalogRoutes)
app.use('/api/orders', orderRoutes)
app.use('/api/shipments', shipmentRoutes)
app.use('/api/restocks', restockRoutes)
app.use('/api/complaints', complaintRoutes)
app.use('/api/service-visits', serviceRoutes)
app.use('/api/returns', returnRoutes)
app.use('/api/notifications', notificationRoutes)
app.use('/api/fleet', fleetRoutes)
app.use('/api/transfers', transferRoutes)

app.use(notFound)
app.use(errorHandler)

export default app
