import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react'
import { apiRequest, toSessionUser } from '../lib/api'

const STORAGE_KEY = 'warex-state-v2'
const SESSION_KEY = 'warex-session-v2'
const TOKEN_KEY = 'warex-auth-token'

const seed = {
  users: [
    { id: 'U-0001', name: 'WAREX Main Admin', email: 'admin@warex.com', password: 'admin123', roleId: 'admin', active: true, createdAt: '2026-09-20' },
    { id: 'U-0002', name: 'Hero Electronics', email: 'manufacturer@warex.com', password: 'demo123', roleId: 'manufacturer', active: true, createdAt: '2026-09-21' },
    { id: 'U-0003', name: 'Pune Warehouse', email: 'warehouse@warex.com', password: 'demo123', roleId: 'warehouse_manager', active: true, createdAt: '2026-09-21' },
    { id: 'U-0004', name: 'Fleet Partner One', email: 'delivery@warex.com', password: 'demo123', roleId: 'delivery_partner', active: true, createdAt: '2026-09-21' },
    { id: 'U-0005', name: 'Sharma Electronics', email: 'customer@warex.com', password: 'demo123', roleId: 'business_customer', active: true, createdAt: '2026-09-21' },
    { id: 'U-0006', name: 'Service Technician', email: 'technician@warex.com', password: 'demo123', roleId: 'technician', active: true, createdAt: '2026-09-21' },
  ],
  products: [
    { code: 'TV-55-4K-SAM', name: 'Samsung 55" 4K Smart TV', category: 'Television', price: 56999, cartonSize: 1, reorder: 20, assembly: true, active: true },
    { code: 'TV-43-4K-SAM', name: 'Samsung 43" 4K Smart TV', category: 'Television', price: 39999, cartonSize: 1, reorder: 15, assembly: true, active: true },
    { code: 'AC-1.5T-SPLIT-LG', name: 'LG 1.5 Ton Split AC', category: 'Air Conditioner', price: 42999, cartonSize: 1, reorder: 10, assembly: true, active: true },
    { code: 'AC-1T-SPLIT-VOLTAS', name: 'Voltas 1 Ton Split AC', category: 'Air Conditioner', price: 31999, cartonSize: 1, reorder: 8, assembly: true, active: true },
    { code: 'MW-20L-SOLO-IFB', name: 'IFB 20L Solo Microwave', category: 'Microwave', price: 8499, cartonSize: 1, reorder: 15, assembly: false, active: true },
    { code: 'CHG-65W-USB-C', name: '65W USB-C Fast Charger', category: 'Accessories', price: 1499, cartonSize: 50, reorder: 100, assembly: false, active: true },
    { code: 'RF-190L-DIR-WHIRL', name: 'Whirlpool 190L Direct-Cool Fridge', category: 'Refrigerator', price: 18499, cartonSize: 1, reorder: 12, assembly: true, active: true },
    { code: 'CBL-HDMI-2M', name: 'HDMI Cable 2m', category: 'Accessories', price: 499, cartonSize: 100, reorder: 100, assembly: false, active: false },
  ],
  inventory: [
    { sku: 'TV-55-4K-SAM', name: 'Samsung 55" 4K Smart TV', bin: 'A-12-03', available: 48, reserved: 8, incoming: 20, reorder: 20 },
    { sku: 'TV-43-4K-SAM', name: 'Samsung 43" 4K Smart TV', bin: 'A-14-01', available: 34, reserved: 4, incoming: 12, reorder: 15 },
    { sku: 'AC-1.5T-SPLIT-LG', name: 'LG 1.5 Ton Split AC', bin: 'B-06-02', available: 11, reserved: 2, incoming: 12, reorder: 10 },
    { sku: 'AC-1T-SPLIT-VOLTAS', name: 'Voltas 1 Ton Split AC', bin: 'B-09-04', available: 7, reserved: 1, incoming: 6, reorder: 8 },
    { sku: 'MW-20L-SOLO-IFB', name: 'IFB 20L Solo Microwave', bin: 'C-02-01', available: 19, reserved: 2, incoming: 8, reorder: 15 },
    { sku: 'CHG-65W-USB-C', name: '65W USB-C Fast Charger', bin: 'C-11-05', available: 260, reserved: 30, incoming: 100, reorder: 100 },
    { sku: 'RF-190L-DIR-WHIRL', name: 'Whirlpool 190L Direct-Cool Fridge', bin: 'A-18-02', available: 16, reserved: 3, incoming: 6, reorder: 12 },
  ],
  warehouses: [
    { id: 'WH-PN-01', name: 'Pune Central Warehouse', city: 'Pune', occupancy: 82, manager: 'Pune Warehouse' },
    { id: 'WH-MU-01', name: 'Mumbai Distribution Hub', city: 'Mumbai', occupancy: 74, manager: 'Mumbai Warehouse' },
    { id: 'WH-NG-01', name: 'Nagpur North Hub', city: 'Nagpur', occupancy: 61, manager: 'Nagpur Warehouse' },
  ],
  orders: [
    { id: 'ORD-2026-1042', customerEmail: 'customer@warex.com', customerName: 'Sharma Electronics', items: [{ sku: 'TV-55-4K-SAM', name: 'Samsung 55" 4K Smart TV', qty: 4, price: 56999 }], total: 227996, status: 'Confirmed', warehouse: 'Pune Central Warehouse', createdAt: '2026-09-26 10:15', shipmentId: null },
    { id: 'ORD-2026-1039', customerEmail: 'customer@warex.com', customerName: 'Sharma Electronics', items: [{ sku: 'CHG-65W-USB-C', name: '65W USB-C Fast Charger', qty: 50, price: 1499 }], total: 74950, status: 'Packed', warehouse: 'Pune Central Warehouse', createdAt: '2026-09-25 16:20', shipmentId: 'SHP-2026-3008' },
    { id: 'ORD-2026-1032', customerEmail: 'customer@warex.com', customerName: 'Sharma Electronics', items: [{ sku: 'AC-1.5T-SPLIT-LG', name: 'LG 1.5 Ton Split AC', qty: 2, price: 42999 }], total: 85998, status: 'Delivered', warehouse: 'Pune Central Warehouse', createdAt: '2026-09-23 09:40', shipmentId: 'SHP-2026-3001' },
  ],
  shipments: [
    { id: 'SHP-2026-3008', orderId: 'ORD-2026-1039', customerName: 'Sharma Electronics', deliveryEmail: 'delivery@warex.com', deliveryName: 'Fleet Partner One', status: 'Assigned', eta: '27 Sep, 2:00 PM', proof: false },
    { id: 'SHP-2026-3001', orderId: 'ORD-2026-1032', customerName: 'Sharma Electronics', deliveryEmail: 'delivery@warex.com', deliveryName: 'Fleet Partner One', status: 'Delivered', eta: '23 Sep, 5:00 PM', proof: true },
  ],
  restocks: [
    { id: 'RST-2026-0148', manufacturerEmail: 'manufacturer@warex.com', manufacturer: 'Hero Electronics', sku: 'TV-55-4K-SAM', qty: 20, docs: 'invoice-0148.pdf', status: 'Submitted', warehouse: 'Pune Central Warehouse', createdAt: '2026-09-26 11:25' },
    { id: 'RST-2026-0143', manufacturerEmail: 'manufacturer@warex.com', manufacturer: 'Hero Electronics', sku: 'AC-1.5T-SPLIT-LG', qty: 12, docs: 'invoice-0143.pdf', status: 'Received', warehouse: 'Pune Central Warehouse', createdAt: '2026-09-24 09:10' },
  ],
  complaints: [
    { id: 'CMP-2026-0042', orderId: 'ORD-2026-1032', customerEmail: 'customer@warex.com', subject: 'Installation issue', description: 'AC installation needs technician visit.', status: 'Open', assignedTo: 'technician@warex.com', createdAt: '2026-09-25 15:20' },
  ],
  serviceVisits: [
    { id: 'SV-2026-0021', complaintId: 'CMP-2026-0042', customerName: 'Sharma Electronics', technicianEmail: 'technician@warex.com', orderId: 'ORD-2026-1032', status: 'Assigned', assemblyRequired: true, defectFound: false, report: '' },
  ],
  vehicles: [],
  deliveryRuns: [],
  transfers: [],
  sellThrough: [],
  returns: [],
  notifications: [
    { id: 'N-1', target: 'admin', message: 'New bulk order ORD-2026-1042 requires warehouse processing.', read: false, createdAt: '2026-09-26 10:16' },
    { id: 'N-2', target: 'warehouse_manager', message: 'Restock RST-2026-0148 is awaiting receipt.', read: false, createdAt: '2026-09-26 11:26' },
    { id: 'N-3', target: 'delivery_partner', message: 'Shipment SHP-2026-3008 has been assigned to you.', read: false, createdAt: '2026-09-26 12:05' },
  ],
}


const WarexContext = createContext(null)

function makeId(prefix) { return `${prefix}-${Date.now().toString().slice(-8)}` }
function fmtDate(value) { return value ? new Date(value).toLocaleString() : '—' }
function number(value) { return Number(value ?? 0) }
function readSession() {
  try { const raw = sessionStorage.getItem(SESSION_KEY); return raw ? JSON.parse(raw) : null } catch { return null }
}
function statusLabel(value, map) { return map[value] || value || 'Unknown' }

function mapUser(user) {
  return {
    id: user.id,
    name: user.fullName || user.name,
    email: user.email,
    roleId: user.roleId || user.role?.id,
    roleName: user.roleName || user.role?.name,
    active: (user.status || 'ACTIVE') === 'ACTIVE',
    isMainAdmin: Boolean(user.isMainAdmin),
    createdAt: user.createdAt ? new Date(user.createdAt).toLocaleDateString() : '',
  }
}
function mapProduct(product) {
  return {
    id: product.id,
    dbId: product.id,
    code: product.sku,
    name: product.name,
    category: product.category,
    price: number(product.unitPrice),
    cartonSize: number(product.cartonSize || 1),
    reorder: number(product.reorderThreshold),
    assembly: Boolean(product.requiresAssembly),
    active: Boolean(product.isActive),
  }
}
function mapInventory(item) {
  return {
    id: item.id,
    dbId: item.id,
    warehouseId: item.warehouseId,
    skuId: item.skuId,
    sku: item.sku?.sku || item.skuId,
    name: item.sku?.name || 'Unknown product',
    bin: item.rackBin?.locationCode || item.warehouse?.name || 'UNASSIGNED',
    warehouse: item.warehouse?.name || 'Warehouse',
    available: number(item.quantity),
    reserved: number(item.reserved),
    incoming: number(item.incoming),
    reorder: number(item.sku?.reorderThreshold),
  }
}
function mapOrder(order) {
  const status = statusLabel(order.status, { PLACED: 'Placed', CONFIRMED: 'Confirmed', RESERVED: 'Reserved', DELAYED: 'Delayed', PICKING: 'Picked', PACKED: 'Packed', PROCESSED: 'Shipment Created', SHIPPED: 'Out for Delivery', DELIVERED: 'Delivered', CLOSED: 'Closed' })
  return {
    id: order.orderNumber,
    dbId: order.id,
    customerEmail: order.customer?.email || '',
    customerName: order.customer?.fullName || 'Business Customer',
    items: (order.items || []).map((item) => ({ sku: item.sku?.sku || item.skuId, skuId: item.skuId, name: item.sku?.name || 'Product', qty: number(item.quantity), price: number(item.unitPrice) })),
    total: number(order.totalAmount),
    status,
    warehouse: order.warehouse?.name || 'WAREX Warehouse',
    warehouseId: order.warehouseId,
    createdAt: fmtDate(order.createdAt || order.orderDate),
    shipmentId: order.shipment?.shipmentNumber || null,
  }
}
function mapShipment(shipment) {
  const statuses = { CREATED: 'Created', ASSIGNED: 'Assigned', IN_TRANSIT: 'Out for delivery', DELIVERED: 'Delivered', CLOSED: 'Closed' }
  return {
    id: shipment.shipmentNumber,
    dbId: shipment.id,
    orderId: shipment.order?.orderNumber || '',
    orderDbId: shipment.orderId,
    customerName: shipment.order?.customer?.fullName || 'Business Customer',
    deliveryEmail: shipment.deliveryPartner?.email || '',
    deliveryName: shipment.deliveryPartner?.fullName || '',
    deliveryPartnerId: shipment.deliveryPartnerId,
    status: statusLabel(shipment.status, statuses),
    eta: shipment.eta ? fmtDate(shipment.eta) : 'To be scheduled',
    proof: Boolean(shipment.proofOfDelivery),
    trackingNumber: shipment.trackingNumber,
  }
}
function mapRestock(item) {
  const first = item.items?.[0]
  return {
    id: item.restockId,
    dbId: item.id,
    itemId: first?.id,
    manufacturerEmail: item.dealer?.email || '',
    manufacturer: item.dealer?.fullName || 'Dealer / Manufacturer',
    sku: first?.sku?.sku || '',
    skuId: first?.skuId,
    qty: number(first?.quantity),
    docs: item.documentReference || '—',
    status: statusLabel(item.status, { SUBMITTED: 'Submitted', VALIDATED: 'Validated', REJECTED: 'Rejected', RECEIVED: 'Received', ACCEPTED: 'Received' }),
    warehouse: item.destination?.name || 'WAREX Warehouse',
    warehouseId: item.destinationId,
    createdAt: fmtDate(item.createdAt),
  }
}
function mapComplaint(item) {
  const status = statusLabel(item.status, { OPEN: 'Open', ASSIGNED: 'Service Assigned', IN_PROGRESS: 'In Progress', RESOLVED: 'Resolved', CLOSED: 'Closed' })
  return {
    id: item.complaintId,
    dbId: item.id,
    orderId: item.order?.orderNumber || '',
    orderDbId: item.orderId,
    customerEmail: item.customer?.email || '',
    customerName: item.customer?.fullName || '',
    subject: item.complaintType,
    description: item.description,
    priority: item.priority,
    status,
    assignedTo: item.serviceVisit?.technician?.email || '',
    createdAt: fmtDate(item.createdAt),
  }
}
function mapServiceVisit(item) {
  const statuses = { ASSIGNED: 'Assigned', VISIT_ACCEPTED: 'Visit Accepted', INSPECTED: 'Inspected', ASSEMBLY_COMPLETED: 'Assembly Completed', DEFECT_FOUND: 'Defect Found', REPAIR_COMPLETED: 'Repair Completed', COMPLETED: 'Completed' }
  return {
    id: item.visitId,
    dbId: item.id,
    complaintId: item.complaint?.complaintId || '',
    complaintDbId: item.complaintId,
    customerName: item.complaint?.customer?.fullName || 'Business Customer',
    technicianEmail: item.technician?.email || '',
    orderId: item.complaint?.order?.orderNumber || '',
    status: statusLabel(item.status, statuses),
    assemblyRequired: Boolean(item.assemblyRequired),
    defectFound: Boolean(item.defectFound),
    report: item.notes || '',
  }
}
function mapNotification(item, session) {
  return { id: item.notificationId, dbId: item.id, target: session?.roleId, targetEmail: session?.email, message: item.message, read: Boolean(item.readStatus), createdAt: fmtDate(item.createdAt) }
}
function mapReturn(item) {
  return { id: item.returnId, dbId: item.id, order: item.order?.orderNumber || '', orderDbId: item.orderId, sku: item.sku?.sku || 'All items', skuId: item.skuId || '', reason: item.reason, status: statusLabel(item.status, { REQUESTED: 'Open', APPROVED: 'Approved', REJECTED: 'Rejected', RECEIVED: 'Received', COMPLETED: 'Closed' }), customerEmail: item.customer?.email || '', createdAt: fmtDate(item.createdAt) }
}
function mapTransfer(item) {
  return {
    id: item.transferId,
    dbId: item.id,
    from: item.fromWarehouse?.name || 'Unknown warehouse',
    to: item.toWarehouse?.name || 'Unknown warehouse',
    fromWarehouseId: item.fromWarehouseId,
    toWarehouseId: item.toWarehouseId,
    fromManagerId: item.fromWarehouse?.managerId || null,
    toManagerId: item.toWarehouse?.managerId || null,
    status: statusLabel(item.status, { REQUESTED: 'Requested', IN_TRANSIT: 'In transit', RECEIVED: 'Received', CANCELLED: 'Cancelled' }),
    items: (item.items || []).map((line) => ({ sku: line.sku?.sku || line.skuId, skuId: line.skuId, name: line.sku?.name || 'Product', qty: number(line.quantity), receivedQty: number(line.receivedQuantity) })),
    createdAt: fmtDate(item.createdAt),
  }
}

async function fetchBackendState(session) {
  const roleId = session.roleId
  const usersPath = session.isMainAdmin ? '/users' : '/catalog/team'
  const canSeeInventory = ['admin', 'warehouse_manager'].includes(roleId)
  const canSeeOrders = ['admin', 'warehouse_manager', 'business_customer'].includes(roleId)
  const canSeeShipments = ['admin', 'warehouse_manager', 'delivery_partner', 'business_customer'].includes(roleId)
  const canSeeComplaints = ['admin', 'business_customer'].includes(roleId)
  const canSeeServiceVisits = ['admin', 'technician'].includes(roleId)
  const canSeeReturns = ['admin', 'warehouse_manager', 'business_customer'].includes(roleId)
  const canSeeRestocks = ['admin', 'warehouse_manager', 'manufacturer'].includes(roleId)
  const canSeeFleet = ['admin', 'warehouse_manager', 'delivery_partner'].includes(roleId)
  const canSeeTransfers = ['admin', 'warehouse_manager'].includes(roleId)
  const canSeeSellThrough = ['admin', 'manufacturer'].includes(roleId)

  const [products, warehouses, inventory, orders, shipments, restocks, complaints, visits, notifications, users, returns, vehicles, deliveryRuns, transfers, sellThrough] = await Promise.all([
    apiRequest('/catalog/products?includeInactive=true'),
    apiRequest('/catalog/warehouses'),
    canSeeInventory ? apiRequest('/catalog/inventory') : Promise.resolve([]),
    canSeeOrders ? apiRequest('/orders') : Promise.resolve([]),
    canSeeShipments ? apiRequest('/shipments') : Promise.resolve([]),
    canSeeRestocks ? apiRequest('/restocks') : Promise.resolve([]),
    canSeeComplaints ? apiRequest('/complaints') : Promise.resolve([]),
    canSeeServiceVisits ? apiRequest('/service-visits') : Promise.resolve([]),
    apiRequest('/notifications'),
    apiRequest(usersPath),
    canSeeReturns ? apiRequest('/returns') : Promise.resolve([]),
    canSeeFleet ? apiRequest('/fleet/vehicles') : Promise.resolve([]),
    canSeeFleet ? apiRequest('/fleet/runs') : Promise.resolve([]),
    canSeeTransfers ? apiRequest('/transfers') : Promise.resolve([]),
    canSeeSellThrough ? apiRequest('/catalog/sell-through') : Promise.resolve([]),
  ])
  const mappedWarehouses = warehouses.map((item) => ({ id: item.id, dbId: item.id, name: item.name, city: item.city, address: item.address || '', capacity: number(item.capacity), occupancy: 0, active: item.status === 'ACTIVE', manager: item.manager?.fullName || 'Unassigned', managerId: item.managerId }))
  return {
    products: products.map(mapProduct),
    warehouses: mappedWarehouses,
    inventory: inventory.map(mapInventory),
    orders: orders.map(mapOrder),
    shipments: shipments.map(mapShipment),
    restocks: restocks.map(mapRestock),
    complaints: complaints.map(mapComplaint),
    serviceVisits: visits.map(mapServiceVisit),
    notifications: notifications.map((item) => mapNotification(item, session)),
    users: users.map(mapUser),
    returns: returns.map(mapReturn),
    vehicles: vehicles.map((vehicle) => ({ ...vehicle, id: vehicle.id, dbId: vehicle.id, reg: vehicle.registrationNo, statusLabel: ({ AVAILABLE: 'Available', IN_USE: 'In use', MAINTENANCE: 'Maintenance' })[vehicle.status] || vehicle.status })),
    deliveryRuns: deliveryRuns.map((run) => ({ ...run, id: run.runId, dbId: run.id, vehicleRegistration: run.vehicle?.registrationNo || 'Unassigned', driverName: run.deliveryPartner?.fullName || 'Unassigned' })),
    transfers: transfers.map(mapTransfer),
    sellThrough: sellThrough.map((item) => ({ ...item, unitPrice: number(item.unitPrice), unitsSold: number(item.unitsSold), revenue: number(item.revenue), orderCount: number(item.orderCount) })),
  }
}

function roleLabel(roleId) {
  return ({ admin: 'Main Admin', warehouse_manager: 'Warehouse Manager', delivery_partner: 'Delivery Partner', business_customer: 'Business Customer', manufacturer: 'Dealer / Manufacturer', technician: 'Technician' })[roleId] || roleId || 'assigned recipient'
}
function findByDisplayId(rows, value) { return rows.find((row) => row.id === value || row.dbId === value) }

export function WarexProvider({ children }) {
  const [state, setState] = useState(() => {
    try { const raw = localStorage.getItem(STORAGE_KEY); return raw ? JSON.parse(raw) : seed } catch { return seed }
  })
  const [session, setSessionState] = useState(readSession)
  const [authLoading, setAuthLoading] = useState(() => Boolean(sessionStorage.getItem(TOKEN_KEY)))
  const [dataLoading, setDataLoading] = useState(false)
  const [toast, setToast] = useState(null)

  const pushToast = useCallback((message, type = 'success') => {
    setToast({ id: Date.now(), message, type })
    window.setTimeout(() => setToast((current) => current?.message === message ? null : current), 3600)
  }, [])

  const refreshData = useCallback(async (activeSession = session) => {
    if (!activeSession || !sessionStorage.getItem(TOKEN_KEY)) return false
    setDataLoading(true)
    try {
      const fresh = await fetchBackendState(activeSession)
      setState((current) => {
        const next = { ...current, ...fresh }
        try { localStorage.setItem(STORAGE_KEY, JSON.stringify(next)) } catch { /* Database remains source of truth. */ }
        return next
      })
      return true
    } finally {
      setDataLoading(false)
    }
  }, [session])

  useEffect(() => {
    const token = sessionStorage.getItem(TOKEN_KEY)
    if (!token) { setSessionState(null); setAuthLoading(false); return }
    let cancelled = false
    ;(async () => {
      let restored
      try {
        const user = await apiRequest('/auth/me')
        restored = toSessionUser(user)
        if (cancelled) return
        sessionStorage.setItem(SESSION_KEY, JSON.stringify(restored))
        setSessionState(restored)
      } catch (error) {
        if (!cancelled) {
          sessionStorage.removeItem(TOKEN_KEY)
          sessionStorage.removeItem(SESSION_KEY)
          setSessionState(null)
          setToast({ id: Date.now(), message: `Your session could not be verified: ${error.message}`, type: 'error' })
        }
        return
      } finally {
        if (!cancelled) setAuthLoading(false)
      }
      // Keep a valid login if a non-auth data endpoint is temporarily unavailable.
      try {
        const fresh = await fetchBackendState(restored)
        if (!cancelled) setState((current) => ({ ...current, ...fresh }))
      } catch (error) {
        if (!cancelled) setToast({ id: Date.now(), message: `Signed in, but some live data could not load: ${error.message}. Use Refresh to try again.`, type: 'error' })
      }
    })()
    return () => { cancelled = true }
  }, [])

  const login = useCallback(async (email, password) => {
    try {
      const result = await apiRequest('/auth/login', { method: 'POST', body: JSON.stringify({ email: email.trim(), password }) })
      if (!result?.token || !result?.user) return { ok: false, error: 'The WAREX API returned an incomplete login response.' }
      sessionStorage.setItem(TOKEN_KEY, result.token)
      const next = toSessionUser(result.user)
      sessionStorage.setItem(SESSION_KEY, JSON.stringify(next))
      setSessionState(next)
      try {
        const fresh = await fetchBackendState(next)
        setState((current) => ({ ...current, ...fresh }))
      } catch (error) {
        pushToast(`Signed in, but live data did not load: ${error.message}`, 'error')
      }
      pushToast(`Welcome back, ${next.name}.`)
      return { ok: true, session: next }
    } catch (error) { return { ok: false, error: error.message || 'Unable to sign in.' } }
  }, [pushToast])

  const logout = useCallback(() => {
    sessionStorage.removeItem(TOKEN_KEY)
    sessionStorage.removeItem(SESSION_KEY)
    setSessionState(null)
    pushToast('You have signed out.')
  }, [pushToast])

  const createUser = useCallback(async (data) => {
    try {
      const result = await apiRequest('/users', { method: 'POST', body: JSON.stringify({ fullName: data.name, email: data.email, password: data.password || 'welcome123', roleId: data.roleId }) })
      await refreshData()
      const user = mapUser(result)
      pushToast(`User ${user.name} created and assigned the ${roleLabel(user.roleId)} role.`)
      return { ok: true, user }
    } catch (error) { pushToast(`Could not create user: ${error.message}`, 'error'); return { ok: false, error: error.message } }
  }, [pushToast, refreshData])

  const updateUser = useCallback(async (id, patch) => {
    const existing = findByDisplayId(state.users, id)
    try {
      if (!existing) throw new Error('User not found in the current data.')
      await apiRequest(`/users/${existing.dbId || existing.id}`, { method: 'PATCH', body: JSON.stringify({ ...(patch.name !== undefined ? { fullName: patch.name } : {}), ...(patch.roleId !== undefined ? { roleId: patch.roleId } : {}), ...(patch.active !== undefined ? { status: patch.active ? 'ACTIVE' : 'INACTIVE' } : {}) }) })
      await refreshData()
      pushToast('User details saved to the WAREX database.')
      return true
    } catch (error) { pushToast(`Could not update user: ${error.message}`, 'error'); return false }
  }, [state.users, pushToast, refreshData])

  const toggleUser = useCallback(async (id) => {
    const user = findByDisplayId(state.users, id)
    if (!user) { pushToast('User not found.', 'error'); return false }
    return updateUser(id, { active: !user.active })
  }, [state.users, updateUser, pushToast])

  const createProduct = useCallback(async (data) => {
    try {
      const product = await apiRequest('/catalog/products', { method: 'POST', body: JSON.stringify({ sku: data.code.trim().toUpperCase(), name: data.name.trim(), category: data.category, unitPrice: Number(data.price || 0), cartonSize: Number(data.cartonSize || 1), requiresAssembly: Boolean(data.assembly), reorderThreshold: Number(data.reorder || 0) }) })
      await refreshData()
      pushToast(`${product.sku} added to the database. Initial inventory records were created for active warehouses.`)
      return mapProduct(product)
    } catch (error) { pushToast(`Could not add product: ${error.message}`, 'error'); return null }
  }, [refreshData, pushToast])

  const updateProduct = useCallback(async (code, patch) => {
    const product = state.products.find((item) => item.code === code)
    if (!product) { pushToast(`SKU ${code} was not found.`, 'error'); return false }
    try {
      await apiRequest(`/catalog/products/${product.dbId || product.id}`, { method: 'PATCH', body: JSON.stringify({ ...(patch.name !== undefined ? { name: patch.name } : {}), ...(patch.category !== undefined ? { category: patch.category } : {}), ...(patch.price !== undefined ? { unitPrice: Number(patch.price) } : {}), ...(patch.cartonSize !== undefined ? { cartonSize: Number(patch.cartonSize) } : {}), ...(patch.reorder !== undefined ? { reorderThreshold: Number(patch.reorder) } : {}), ...(patch.assembly !== undefined ? { requiresAssembly: Boolean(patch.assembly) } : {}), ...(patch.active !== undefined ? { isActive: Boolean(patch.active) } : {}) }) })
      await refreshData()
      pushToast(`SKU ${code} updated in the database.`)
      return true
    } catch (error) { pushToast(`Could not update SKU: ${error.message}`, 'error'); return false }
  }, [state.products, refreshData, pushToast])

  const toggleProduct = useCallback(async (code) => {
    const product = state.products.find((item) => item.code === code)
    if (!product) { pushToast(`SKU ${code} was not found.`, 'error'); return false }
    return updateProduct(code, { active: !product.active })
  }, [state.products, updateProduct, pushToast])

  const adjustInventory = useCallback(async (sku, delta, metadata = {}) => {
    const item = state.inventory.find((row) => row.sku === sku)
    if (!item) { pushToast(`No inventory record for ${sku} is available to adjust.`, 'error'); return false }
    try {
      await apiRequest(`/catalog/inventory/${item.dbId || item.id}/adjust`, { method: 'PATCH', body: JSON.stringify({ delta: Number(delta), reason: metadata.reason, note: metadata.note }) })
      await refreshData()
      const newQty = number(item.available) + Number(delta)
      const threshold = number(item.reorder)
      if (threshold > 0 && newQty <= threshold) pushToast(`Stock for ${sku} is low (${newQty} left; threshold ${threshold}). Admin and Warehouse Manager have been alerted.`, 'error')
      else pushToast(`Inventory for ${sku} saved. Available stock: ${newQty}.`)
      return true
    } catch (error) { pushToast(`Stock adjustment failed: ${error.message}`, 'error'); return false }
  }, [state.inventory, refreshData, pushToast])

  const createOrder = useCallback(async (customer, cart) => {
    try {
      if (!cart.length) throw new Error('Your cart is empty.')
      const warehouse = state.warehouses.find((item) => item.active !== false) || state.warehouses[0]
      if (!warehouse) throw new Error('No active warehouse is available.')
      const items = cart.map(({ product, qty }) => {
        const sku = state.products.find((p) => p.code === product.code)
        if (!sku) throw new Error(`SKU ${product.code} is no longer available.`)
        return { skuId: sku.dbId || sku.id, quantity: Number(qty) }
      })
      const result = await apiRequest('/orders', { method: 'POST', body: JSON.stringify({ warehouseId: warehouse.dbId || warehouse.id, items }) })
      await refreshData()
      const recipient = result.routing?.recipientRole || 'Warehouse Manager'
      const count = result.routing?.recipientCount
      pushToast(`Request ${result.orderNumber} submitted successfully and routed to ${recipient}${Number.isInteger(count) ? ` (${count} active recipient${count === 1 ? '' : 's'} notified)` : ''}. Their dashboard has been notified.`)
      return mapOrder(result)
    } catch (error) { pushToast(`Order request failed: ${error.message}`, 'error'); return null }
  }, [state.products, state.warehouses, refreshData, pushToast])

  const updateOrder = useCallback(async (orderId, status) => {
    const order = findByDisplayId(state.orders, orderId)
    if (!order) { pushToast(`Order ${orderId} was not found.`, 'error'); return false }
    try {
      if (status === 'Closed') await apiRequest(`/orders/${order.dbId}/confirm-receipt`, { method: 'POST' })
      else if (status === 'Confirmed') await apiRequest(`/orders/${order.dbId}/confirm`, { method: 'POST' })
      else throw new Error(`Unsupported order transition: ${status}`)
      await refreshData()
      pushToast(`Order ${order.id} updated to ${status} in the database.`)
      return true
    } catch (error) { pushToast(`Could not update order: ${error.message}`, 'error'); return false }
  }, [state.orders, refreshData, pushToast])

  const reserveStock = useCallback(async (orderId) => {
    const order = findByDisplayId(state.orders, orderId)
    if (!order) { pushToast(`Order ${orderId} was not found.`, 'error'); return false }
    try {
      await apiRequest(`/orders/${order.dbId}/reserve`, { method: 'POST' })
      await refreshData()
      pushToast(`Stock reserved for ${order.id}. Inventory was updated in PostgreSQL.`)
      return true
    } catch (error) {
      try { await refreshData() } catch { /* Show the original operation error. */ }
      pushToast(error.message || `Could not reserve stock for ${order.id}.`, 'error')
      return false
    }
  }, [state.orders, refreshData, pushToast])

  const pickPackOrder = useCallback(async (orderId, step) => {
    const order = findByDisplayId(state.orders, orderId)
    if (!order) { pushToast(`Order ${orderId} was not found.`, 'error'); return false }
    try {
      await apiRequest(`/orders/${order.dbId}/${step === 'pick' ? 'pick' : 'pack'}`, { method: 'POST' })
      await refreshData()
      pushToast(`${order.id} marked ${step === 'pick' ? 'Picked' : 'Packed'} and saved.`)
      return true
    } catch (error) { pushToast(`Could not update pick/pack status: ${error.message}`, 'error'); return false }
  }, [state.orders, refreshData, pushToast])

  const createShipment = useCallback(async (orderId, packageDetails = {}) => {
    const order = findByDisplayId(state.orders, orderId)
  
    if (!order) {
      pushToast(`Order ${orderId} was not found.`, 'error')
      return null
    }
  
    const requiredFields = [
      ['packageWeightKg', 'Package weight'],
      ['packageLengthCm', 'Package length'],
      ['packageWidthCm', 'Package width'],
      ['packageHeightCm', 'Package height'],
      ['estimatedDistanceKm', 'Estimated delivery distance'],
    ]
  
    const payload = {}
  
    for (const [field, label] of requiredFields) {
      const value = Number(packageDetails[field])
  
      if (
        packageDetails[field] === undefined ||
        packageDetails[field] === null ||
        packageDetails[field] === '' ||
        !Number.isFinite(value) ||
        value <= 0
      ) {
        pushToast(
          `${label} must be a number greater than zero.`,
          'error'
        )
        return null
      }
  
      payload[field] = value
    }
  
    let shipment
  
    try {
      shipment = await apiRequest(
        `/shipments/from-order/${encodeURIComponent(order.dbId || order.id)}`,
        {
          method: 'POST',
          body: JSON.stringify(payload),
        }
      )
    } catch (error) {
      pushToast(`Could not create shipment: ${error.message}`, 'error')
      return null
    }
  
    let refreshSucceeded = false
  
    try {
      refreshSucceeded = await refreshData()
    } catch {
      refreshSucceeded = false
    }
  
    const shipmentNumber =
      shipment.shipmentNumber || shipment.id || order.id
  
    const recipient =
      shipment.routing?.recipientRole || 'Delivery Partner'
  
    const count = shipment.routing?.recipientCount
  
    const vehicle =
      shipment.vehicleRecommendation ||
      shipment.deliveryRun?.vehicle
  
    const vehicleMessage = vehicle
      ? ` Selected vehicle: ${vehicle.vehicleType || 'Vehicle'}${
          vehicle.registrationNo
            ? ` (${vehicle.registrationNo})`
            : ''
        }.`
      : ''
  
    const recipientMessage = Number.isInteger(count)
      ? `${count} active ${
          count === 1 ? 'recipient was' : 'recipients were'
        } notified.`
      : `Routed to ${recipient} for assignment.`
  
    pushToast(
      `Shipment ${shipmentNumber} created for order ${order.id}.${vehicleMessage} ${recipientMessage}${
        refreshSucceeded
          ? ''
          : ' Please refresh the page to reload current data.'
      }`,
      refreshSucceeded ? 'success' : 'error'
    )
  
    return shipment
  }, [state.orders, refreshData, pushToast])

  const assignShipment = useCallback(async (shipmentId, deliveryUser) => {
    const shipment = findByDisplayId(state.shipments, shipmentId)
    if (!shipment) { pushToast(`Shipment ${shipmentId} was not found.`, 'error'); return false }
    const user = typeof deliveryUser === 'string' ? state.users.find((item) => item.email === deliveryUser) : deliveryUser
    if (!user) { pushToast('Choose a valid delivery partner.', 'error'); return false }
    try {
      const result = await apiRequest(`/shipments/${shipment.dbId}/assign`, { method: 'POST', body: JSON.stringify({ deliveryPartnerId: user.dbId || user.id }) })
      await refreshData()
      pushToast(`Shipment ${shipment.id} assigned to ${result.routing?.recipientName || user.name} (${result.routing?.recipientEmail || user.email}). A notification was sent to that Delivery Partner.`)
      return true
    } catch (error) { pushToast(`Could not assign shipment: ${error.message}`, 'error'); return false }
  }, [state.shipments, state.users, refreshData, pushToast])

  const updateShipment = useCallback(async (shipmentId, status) => {
    const shipment = findByDisplayId(state.shipments, shipmentId)
    if (!shipment) { pushToast(`Shipment ${shipmentId} was not found.`, 'error'); return false }
    const normalized = ({ 'Out for delivery': 'IN_TRANSIT', 'Out for Delivery': 'IN_TRANSIT', 'In transit': 'IN_TRANSIT', Delivered: 'DELIVERED', Closed: 'CLOSED', Assigned: 'ASSIGNED', Created: 'CREATED' })[status]
    if (normalized === 'DELIVERED' && !shipment.proof) { pushToast('Record proof of delivery before marking this shipment delivered.', 'error'); return false }
    if (!normalized) { pushToast(`Unsupported shipment status: ${status}`, 'error'); return false }
    try {
      await apiRequest(`/shipments/${shipment.dbId}/status`, { method: 'PATCH', body: JSON.stringify({ status: normalized }) })
      await refreshData()
      pushToast(`Shipment ${shipment.id} updated to ${status}. The customer was notified.`)
      return true
    } catch (error) { pushToast(`Could not update shipment: ${error.message}`, 'error'); return false }
  }, [state.shipments, refreshData, pushToast])

  const confirmReceipt = useCallback(async (orderId) => updateOrder(orderId, 'Closed'), [updateOrder])

  const createRestock = useCallback(async (manufacturer, data) => {
    try {
      const product = state.products.find((item) => item.code === data.sku)
      const warehouse = state.warehouses.find((item) => item.active !== false) || state.warehouses[0]
      if (!product) throw new Error(`SKU ${data.sku} was not found.`)
      if (!warehouse) throw new Error('No active destination warehouse is available.')
      const result = await apiRequest('/restocks', { method: 'POST', body: JSON.stringify({ destinationId: warehouse.dbId || warehouse.id, documentReference: data.docs || null, items: [{ skuId: product.dbId || product.id, quantity: Number(data.qty) }] }) })
      await refreshData()
      const count = result.routing?.recipientCount
      pushToast(`Restock ${result.restockId} submitted to ${result.routing?.recipientRole || 'Warehouse Manager'} for validation${Number.isInteger(count) ? `; ${count} active recipient${count === 1 ? '' : 's'} notified` : ''}.`)
      return mapRestock({ ...result, dealer: { fullName: manufacturer.name, email: manufacturer.email }, destination: warehouse, items: result.items?.length ? result.items : [{ sku: product, skuId: product.id, quantity: data.qty }] })
    } catch (error) { pushToast(`Restock request failed: ${error.message}`, 'error'); return null }
  }, [state.products, state.warehouses, refreshData, pushToast])

  const receiveRestock = useCallback(async (restockId) => {
    const restock = findByDisplayId(state.restocks, restockId)
    if (!restock) { pushToast(`Restock ${restockId} was not found.`, 'error'); return false }
    try {
      await apiRequest(`/restocks/${restock.dbId}/receive`, { method: 'POST', body: JSON.stringify({ accepted: restock.itemId ? { [restock.itemId]: restock.qty } : {} }) })
      await refreshData()
      pushToast(`Restock ${restock.id} received. Inventory was increased and low-stock alerts were recalculated.`)
      return true
    } catch (error) { pushToast(`Could not receive restock: ${error.message}`, 'error'); return false }
  }, [state.restocks, refreshData, pushToast])

  const createComplaint = useCallback(async (customer, data) => {
    try {
      const order = findByDisplayId(state.orders, data.orderId)
      const result = await apiRequest('/complaints', { method: 'POST', body: JSON.stringify({ complaintType: data.subject, description: data.description, orderId: order?.dbId || null, priority: data.priority || 'NORMAL' }) })
      await refreshData()
      const count = result.routing?.recipientCount
      pushToast(`Complaint ${result.complaintId} registered and routed to ${result.routing?.recipientRole || 'Main Admin'}${Number.isInteger(count) ? ` (${count} active recipient${count === 1 ? '' : 's'} notified)` : ''}.`)
      return mapComplaint({ ...result, customer: { fullName: customer.name, email: customer.email }, order: order ? { orderNumber: order.id } : null })
    } catch (error) { pushToast(`Complaint request failed: ${error.message}`, 'error'); return null }
  }, [state.orders, refreshData, pushToast])

  const resolveComplaint = useCallback(async (id) => {
    const complaint = findByDisplayId(state.complaints, id)
    if (!complaint) { pushToast(`Complaint ${id} was not found.`, 'error'); return false }
    try {
      await apiRequest(`/complaints/${complaint.dbId}/status`, { method: 'PATCH', body: JSON.stringify({ status: 'RESOLVED' }) })
      await refreshData()
      pushToast(`Complaint ${complaint.id} resolved. The customer was notified.`)
      return true
    } catch (error) { pushToast(`Could not resolve complaint: ${error.message}`, 'error'); return false }
  }, [state.complaints, refreshData, pushToast])

  const assignTechnician = useCallback(async (complaintId, technicianEmail) => {
    const complaint = findByDisplayId(state.complaints, complaintId)
    const technician = state.users.find((item) => item.email === technicianEmail || item.id === technicianEmail)
    if (!complaint || !technician) { pushToast('Complaint or technician was not found.', 'error'); return false }
    try {
      const result = await apiRequest(`/complaints/${complaint.dbId}/assign-technician`, { method: 'POST', body: JSON.stringify({ technicianId: technician.dbId || technician.id }) })
      await refreshData()
      pushToast(`Service visit ${result.visitId} assigned to ${technician.name} (${technician.email}). The technician and customer were notified.`)
      return true
    } catch (error) { pushToast(`Could not assign technician: ${error.message}`, 'error'); return false }
  }, [state.complaints, state.users, refreshData, pushToast])

  const updateService = useCallback(async (visitId, patch) => {
    const visit = findByDisplayId(state.serviceVisits, visitId)
    if (!visit) { pushToast(`Service visit ${visitId} was not found.`, 'error'); return false }
    const statusMap = { Assigned: 'ASSIGNED', 'Visit Accepted': 'VISIT_ACCEPTED', Inspected: 'INSPECTED', 'Assembly Completed': 'ASSEMBLY_COMPLETED', 'Defect Found': 'DEFECT_FOUND', 'Repair Completed': 'REPAIR_COMPLETED', Completed: 'COMPLETED' }
    try {
      await apiRequest(`/service-visits/${visit.dbId}`, { method: 'PATCH', body: JSON.stringify({ ...(patch.status ? { status: statusMap[patch.status] || patch.status } : {}), ...(patch.assemblyRequired !== undefined ? { assemblyRequired: patch.assemblyRequired } : {}), ...(patch.defectFound !== undefined ? { defectFound: patch.defectFound } : {}), ...(patch.report !== undefined ? { notes: patch.report } : {}) }) })
      await refreshData()
      pushToast(`Service visit ${visit.id} updated and saved. The customer was notified.`)
      return true
    } catch (error) { pushToast(`Could not update service visit: ${error.message}`, 'error'); return false }
  }, [state.serviceVisits, refreshData, pushToast])

  const createTransfer = useCallback(async (data) => {
    try {
      const result = await apiRequest('/transfers', { method: 'POST', body: JSON.stringify(data) })
      await refreshData()
      const count = result.routing?.recipientCount
      pushToast(`Transfer ${result.transferId} requested.${Number.isInteger(count) ? ` ${count} warehouse manager${count === 1 ? '' : 's'} notified.` : ''}`)
      return true
    } catch (error) {
      pushToast(`Could not create transfer: ${error.message}`, 'error')
      return false
    }
  }, [refreshData, pushToast])

  const dispatchTransfer = useCallback(async (transferId) => {
    const transfer = (state.transfers || []).find((item) => item.id === transferId || item.dbId === transferId)
    if (!transfer) { pushToast('Transfer not found.', 'error'); return false }
    try {
      await apiRequest(`/transfers/${transfer.dbId || transfer.id}/dispatch`, { method: 'PATCH' })
      await refreshData()
      pushToast(`Transfer ${transfer.id} dispatched. Source stock has been deducted and destination incoming stock updated.`)
      return true
    } catch (error) {
      pushToast(`Could not dispatch transfer: ${error.message}`, 'error')
      return false
    }
  }, [state.transfers, refreshData, pushToast])

  const receiveTransfer = useCallback(async (transferId) => {
    const transfer = (state.transfers || []).find((item) => item.id === transferId || item.dbId === transferId)
    if (!transfer) { pushToast('Transfer not found.', 'error'); return false }
    try {
      await apiRequest(`/transfers/${transfer.dbId || transfer.id}/receive`, { method: 'PATCH' })
      await refreshData()
      pushToast(`Transfer ${transfer.id} received. Destination stock has been reconciled.`)
      return true
    } catch (error) {
      pushToast(`Could not receive transfer: ${error.message}`, 'error')
      return false
    }
  }, [state.transfers, refreshData, pushToast])

  const createVehicle = useCallback(async (data) => {
    try {
      const result = await apiRequest('/fleet/vehicles', { method: 'POST', body: JSON.stringify(data) })
      await refreshData()
      pushToast(`Vehicle ${result.registrationNo} added to the fleet.`)
      return true
    } catch (error) {
      pushToast(`Could not add vehicle: ${error.message}`, 'error')
      return false
    }
  }, [refreshData, pushToast])

  const updateVehicleStatus = useCallback(async (vehicleId, status) => {
    const vehicle = (state.vehicles || []).find((item) => item.id === vehicleId || item.dbId === vehicleId)
    if (!vehicle) { pushToast('Vehicle not found in the current fleet.', 'error'); return false }
    try {
      await apiRequest(`/fleet/vehicles/${vehicle.dbId || vehicle.id}/status`, { method: 'PATCH', body: JSON.stringify({ status }) })
      await refreshData()
      pushToast(`${vehicle.registrationNo} status updated.`)
      return true
    } catch (error) {
      pushToast(`Could not update vehicle status: ${error.message}`, 'error')
      return false
    }
  }, [state.vehicles, refreshData, pushToast])

  const createReturn = useCallback(async (data) => {
    const order = findByDisplayId(state.orders, data.orderId)
    if (!order) { pushToast('Choose an order that belongs to your account.', 'error'); return false }
    if (!['Delivered', 'Closed'].includes(order.status)) { pushToast('A return can only be requested after delivery.', 'error'); return false }
    try {
      const result = await apiRequest('/returns', { method: 'POST', body: JSON.stringify({ orderId: order.dbId, skuId: data.skuId || null, reason: String(data.reason || '').trim() }) })
      await refreshData()
      const count = result.routing?.recipientCount
      pushToast(`Return ${result.returnId} submitted.${Number.isInteger(count) ? ` ${count} administrator${count === 1 ? '' : 's'} notified.` : ''}`)
      return true
    } catch (error) {
      pushToast(`Could not submit return: ${error.message}`, 'error')
      return false
    }
  }, [state.orders, refreshData, pushToast])

  const updateReturnStatus = useCallback(async (returnId, status) => {
    const item = (state.returns || []).find((row) => row.id === returnId || row.dbId === returnId)
    if (!item) { pushToast('Return request not found.', 'error'); return false }
    const apiStatus = ({ Open: 'REQUESTED', Approved: 'APPROVED', Rejected: 'REJECTED', Received: 'RECEIVED', Closed: 'COMPLETED' })[status] || status
    try {
      await apiRequest(`/returns/${item.dbId || item.id}/status`, { method: 'PATCH', body: JSON.stringify({ status: apiStatus }) })
      await refreshData()
      pushToast(`Return ${item.id} updated to ${status}.`)
      return true
    } catch (error) {
      pushToast(`Could not update return: ${error.message}`, 'error')
      return false
    }
  }, [state.returns, refreshData, pushToast])

  const recordProofOfDelivery = useCallback(async (shipmentId, details = {}) => {
    const shipment = findByDisplayId(state.shipments, shipmentId)
    if (!shipment) { pushToast('Shipment not found.', 'error'); return false }
    if (!String(details.reference || details.notes || '').trim()) {
      pushToast('Enter a proof reference or delivery note before submitting.', 'error')
      return false
    }
    try {
      await apiRequest(`/shipments/${shipment.dbId}/proof`, { method: 'POST', body: JSON.stringify({ podType: details.podType || 'REFERENCE', reference: String(details.reference || '').trim() || null, notes: String(details.notes || '').trim() || null }) })
      await refreshData()
      pushToast(`Proof of delivery recorded for ${shipment.id}.`)
      return true
    } catch (error) {
      pushToast(`Could not record proof of delivery: ${error.message}`, 'error')
      return false
    }
  }, [state.shipments, refreshData, pushToast])

  const markNotificationRead = useCallback(async (id) => {
    const notification = findByDisplayId(state.notifications, id)
    if (!notification) return false
    try {
      await apiRequest(`/notifications/${notification.dbId}/read`, { method: 'PATCH' })
      setState((current) => ({ ...current, notifications: current.notifications.map((item) => item.id === notification.id ? { ...item, read: true } : item) }))
      return true
    } catch (error) { pushToast(`Could not mark notification as read: ${error.message}`, 'error'); return false }
  }, [state.notifications, pushToast])

  const value = useMemo(() => ({
    ...state, session, authLoading, dataLoading, refreshData, setSession: setSessionState,
    login, logout, createUser, updateUser, toggleUser,
    createProduct, updateProduct, toggleProduct, adjustInventory,
    createOrder, updateOrder, reserveStock, pickPackOrder, createShipment,
    assignShipment, updateShipment, confirmReceipt,
    createRestock, receiveRestock, createComplaint, resolveComplaint,
    assignTechnician, updateService, markNotificationRead, createVehicle, updateVehicleStatus, createReturn, updateReturnStatus, recordProofOfDelivery, createTransfer, dispatchTransfer, receiveTransfer, pushToast, toast,
  }), [state, session, authLoading, dataLoading, refreshData, login, logout, createUser, updateUser, toggleUser, createProduct, updateProduct, toggleProduct, adjustInventory, createOrder, updateOrder, reserveStock, pickPackOrder, createShipment, assignShipment, updateShipment, confirmReceipt, createRestock, receiveRestock, createComplaint, resolveComplaint, assignTechnician, updateService, markNotificationRead, createVehicle, updateVehicleStatus, createReturn, updateReturnStatus, recordProofOfDelivery, createTransfer, dispatchTransfer, receiveTransfer, pushToast, toast])

  return <WarexContext.Provider value={value}>{children}</WarexContext.Provider>
}

export function useWarex() {
  const context = useContext(WarexContext)
  if (!context) throw new Error('useWarex must be used inside WarexProvider')
  return context
}
