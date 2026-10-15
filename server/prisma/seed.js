import 'dotenv/config'
import bcrypt from 'bcryptjs'
import { PrismaPg } from '@prisma/adapter-pg'
import { PrismaClient } from '@prisma/client'
import { randomUUID } from 'node:crypto'

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL })
const prisma = new PrismaClient({ adapter })

const roleSeed = [
  { id: 'admin', name: 'Main Admin', description: 'Highest-level WAREX administrator with user and role control.' },
  { id: 'manufacturer', name: 'Dealer / Manufacturer', description: 'Submits restock shipments and tracks stock supply.' },
  { id: 'warehouse_manager', name: 'Warehouse Manager', description: 'Manages inventory, order processing, receiving and shipments.' },
  { id: 'business_customer', name: 'Business Customer', description: 'Browses products, places bulk orders and tracks delivery.' },
  { id: 'delivery_partner', name: 'Delivery Partner', description: 'Accepts assigned deliveries and records delivery completion.' },
  { id: 'technician', name: 'Technician', description: 'Handles after-sales service visits, assembly and repair.' },
]

const demoUsers = [
  { fullName: 'WAREX Main Admin', email: 'admin@warex.com', password: 'admin123', roleId: 'admin', isMainAdmin: true },
  { fullName: 'Hero Electronics', email: 'manufacturer@warex.com', password: 'demo123', roleId: 'manufacturer' },
  { fullName: 'Pune Warehouse', email: 'warehouse@warex.com', password: 'demo123', roleId: 'warehouse_manager' },
  { fullName: 'Fleet Partner One', email: 'delivery@warex.com', password: 'demo123', roleId: 'delivery_partner' },
  { fullName: 'Sharma Electronics', email: 'customer@warex.com', password: 'demo123', roleId: 'business_customer' },
  { fullName: 'Service Technician', email: 'technician@warex.com', password: 'demo123', roleId: 'technician' },
]

const products = [
  ['TV-55-4K-SAM', 'Samsung 55" 4K Smart TV', 'Television', 56999, 1, true, 20],
  ['TV-43-4K-SAM', 'Samsung 43" 4K Smart TV', 'Television', 39999, 1, true, 15],
  ['AC-1.5T-SPLIT-LG', 'LG 1.5 Ton Split AC', 'Air Conditioner', 42999, 1, true, 10],
  ['AC-1T-SPLIT-VOLTAS', 'Voltas 1 Ton Split AC', 'Air Conditioner', 31999, 1, true, 8],
  ['MW-20L-SOLO-IFB', 'IFB 20L Solo Microwave', 'Microwave', 8499, 1, false, 15],
  ['CHG-65W-USB-C', '65W USB-C Fast Charger', 'Accessories', 1499, 50, false, 100],
  ['RF-190L-DIR-WHIRL', 'Whirlpool 190L Direct-Cool Fridge', 'Refrigerator', 18499, 1, true, 12],
]

async function seed() {
  for (const role of roleSeed) {
    await prisma.role.upsert({ where: { id: role.id }, update: role, create: role })
  }

  const userMap = {}
  for (const item of demoUsers) {
    const passwordHash = await bcrypt.hash(item.password, 12)
    const user = await prisma.user.upsert({
      where: { email: item.email },
      update: {
        fullName: item.fullName,
        passwordHash,
        roleId: item.roleId,
        status: 'ACTIVE',
        isMainAdmin: item.isMainAdmin || false,
      },
      create: {
        fullName: item.fullName,
        email: item.email,
        passwordHash,
        roleId: item.roleId,
        status: 'ACTIVE',
        isMainAdmin: item.isMainAdmin || false,
      },
    })
    userMap[item.email] = user
  }

  const warehouse = await prisma.warehouse.upsert({
    where: { id: '11111111-1111-4111-8111-111111111111' },
    update: { name: 'Pune Central Warehouse', city: 'Pune', capacity: 50000, managerId: userMap['warehouse@warex.com'].id },
    create: {
      id: '11111111-1111-4111-8111-111111111111',
      name: 'Pune Central Warehouse',
      city: 'Pune',
      address: 'Pimpri-Chinchwad, Pune',
      capacity: 50000,
      managerId: userMap['warehouse@warex.com'].id,
    },
  })

  const rack = await prisma.rackBin.upsert({
    where: { locationCode: 'A-12-03' },
    update: {},
    create: { locationCode: 'A-12-03', rackCode: 'A-12', binCode: '03', capacity: 100, warehouseId: warehouse.id },
  })

  const skuMap = {}
  for (const [sku, name, category, unitPrice, cartonSize, requiresAssembly, reorderThreshold] of products) {
    const product = await prisma.sKU.upsert({
      where: { sku },
      update: { name, category, unitPrice, cartonSize, requiresAssembly, reorderThreshold, isActive: true },
      create: { sku, name, category, unitPrice, cartonSize, requiresAssembly, reorderThreshold },
    })
    skuMap[sku] = product
  }

  const stockSeed = {
    'TV-55-4K-SAM': [48, 8, 20, rack.id],
    'TV-43-4K-SAM': [34, 4, 12, null],
    'AC-1.5T-SPLIT-LG': [11, 2, 12, null],
    'AC-1T-SPLIT-VOLTAS': [7, 1, 6, null],
    'MW-20L-SOLO-IFB': [19, 2, 8, null],
    'CHG-65W-USB-C': [260, 30, 100, null],
    'RF-190L-DIR-WHIRL': [16, 3, 6, null],
  }
  for (const [sku, [quantity, reserved, incoming, rackBinId]] of Object.entries(stockSeed)) {
    await prisma.inventory.upsert({
      where: { warehouseId_skuId: { warehouseId: warehouse.id, skuId: skuMap[sku].id } },
      update: { quantity, reserved, incoming, rackBinId },
      create: { warehouseId: warehouse.id, skuId: skuMap[sku].id, quantity, reserved, incoming, rackBinId },
    })
  }

  const vehicle = await prisma.vehicle.upsert({
    where: { registrationNo: 'MH14-WRX-01' },
    update: { vehicleType: 'Delivery Van', capacity: 2500, maxWeightKg: 2500, maxLengthCm: 350, maxWidthCm: 180, maxHeightCm: 190, operatingCostPerKm: 16, energyUsePerKm: 0.24, averageSpeedKmph: 32, status: 'AVAILABLE' },
    create: { registrationNo: 'MH14-WRX-01', vehicleType: 'Delivery Van', capacity: 2500, maxWeightKg: 2500, maxLengthCm: 350, maxWidthCm: 180, maxHeightCm: 190, operatingCostPerKm: 16, energyUsePerKm: 0.24, averageSpeedKmph: 32, status: 'AVAILABLE' },
  })

  const run = await prisma.deliveryRun.upsert({
    where: { runId: 'RUN-DEMO-001' },
    update: { route: 'Pune Central → Pimpri → Wakad', vehicleId: vehicle.id, deliveryPartnerId: userMap['delivery@warex.com'].id },
    create: { runId: 'RUN-DEMO-001', route: 'Pune Central → Pimpri → Wakad', vehicleId: vehicle.id, deliveryPartnerId: userMap['delivery@warex.com'].id },
  })

  const order = await prisma.order.upsert({
    where: { orderNumber: 'ORD-DEMO-1042' },
    update: { status: 'PROCESSED', totalAmount: 227996, warehouseId: warehouse.id, customerId: userMap['customer@warex.com'].id },
    create: {
      orderNumber: 'ORD-DEMO-1042',
      status: 'PROCESSED',
      totalAmount: 227996,
      warehouseId: warehouse.id,
      customerId: userMap['customer@warex.com'].id,
      items: { create: [{ skuId: skuMap['TV-55-4K-SAM'].id, quantity: 4, unitPrice: 56999, lineTotal: 227996 }] },
    },
  })

  const shipment = await prisma.shipment.upsert({
    where: { shipmentNumber: 'SHP-DEMO-3008' },
    update: { status: 'ASSIGNED', orderId: order.id, deliveryPartnerId: userMap['delivery@warex.com'].id, deliveryRunId: run.id },
    create: {
      shipmentNumber: 'SHP-DEMO-3008',
      trackingNumber: 'TRK-DEMO-3008',
      status: 'ASSIGNED',
      shipmentDate: new Date(),
      orderId: order.id,
      deliveryPartnerId: userMap['delivery@warex.com'].id,
      deliveryRunId: run.id,
    },
  })

  await prisma.notification.upsert({
    where: { notificationId: 'N-DEMO-001' },
    update: { message: 'New bulk order ORD-DEMO-1042 requires warehouse processing.', recipientId: userMap['warehouse@warex.com'].id, readStatus: false },
    create: { notificationId: 'N-DEMO-001', type: 'ORDER', message: 'New bulk order ORD-DEMO-1042 requires warehouse processing.', recipientId: userMap['warehouse@warex.com'].id },
  })

  console.log('WAREX database seeded successfully.')
  console.log('Demo logins:')
  console.log('admin@warex.com / admin123')
  console.log('manufacturer@warex.com / demo123')
  console.log('warehouse@warex.com / demo123')
  console.log('delivery@warex.com / demo123')
  console.log('customer@warex.com / demo123')
  console.log('technician@warex.com / demo123')

  await prisma.$disconnect()
}

seed().catch(async (error) => {
  console.error(error)
  await prisma.$disconnect()
  process.exit(1)
})
