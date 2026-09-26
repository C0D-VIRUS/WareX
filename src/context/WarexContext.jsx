import { createContext, useCallback, useContext, useMemo, useState } from 'react'

const STORAGE_KEY = 'warex-state-v2'
const SESSION_KEY = 'warex-session-v2'

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
  notifications: [
    { id: 'N-1', target: 'admin', message: 'New bulk order ORD-2026-1042 requires warehouse processing.', read: false, createdAt: '2026-09-26 10:16' },
    { id: 'N-2', target: 'warehouse_manager', message: 'Restock RST-2026-0148 is awaiting receipt.', read: false, createdAt: '2026-09-26 11:26' },
    { id: 'N-3', target: 'delivery_partner', message: 'Shipment SHP-2026-3008 has been assigned to you.', read: false, createdAt: '2026-09-26 12:05' },
  ],
}

const WarexContext = createContext(null)

function readStorage() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    return raw ? JSON.parse(raw) : seed
  } catch {
    return seed
  }
}

function makeId(prefix) {
  return `${prefix}-${Date.now().toString().slice(-8)}`
}

export function WarexProvider({ children }) {
  const [state, setState] = useState(readStorage)
  const [session, setSessionState] = useState(() => {
    try {
      const raw = sessionStorage.getItem(SESSION_KEY)
      return raw ? JSON.parse(raw) : null
    } catch {
      return null
    }
  })
  const [toast, setToast] = useState(null)

  const persist = useCallback((updater) => {
    setState((current) => {
      const next = typeof updater === 'function' ? updater(current) : updater
      localStorage.setItem(STORAGE_KEY, JSON.stringify(next))
      return next
    })
  }, [])

  const pushToast = useCallback((message, type = 'success') => {
    setToast({ id: Date.now(), message, type })
    window.setTimeout(() => setToast(null), 2800)
  }, [])

  const login = useCallback((email, password) => {
    const user = state.users.find((u) => u.email.toLowerCase() === email.trim().toLowerCase() && u.password === password)
    if (!user) return { ok: false, error: 'Invalid email or password.' }
    if (!user.active) return { ok: false, error: 'This account is inactive. Contact the Main Admin.' }
    const next = { userId: user.id, roleId: user.roleId, email: user.email, name: user.name }
    sessionStorage.setItem(SESSION_KEY, JSON.stringify(next))
    setSessionState(next)
    pushToast(`Welcome back, ${user.name}.`)
    return { ok: true, session: next }
  }, [state.users, pushToast])

  const logout = useCallback(() => {
    sessionStorage.removeItem(SESSION_KEY)
    setSessionState(null)
  }, [])

  const createUser = useCallback((data) => {
    const email = data.email.trim().toLowerCase()
    if (state.users.some((u) => u.email.toLowerCase() === email)) {
      return { ok: false, error: 'A user with this email already exists.' }
    }
    const user = { id: makeId('U'), name: data.name.trim(), email, password: data.password || 'welcome123', roleId: data.roleId, active: true, createdAt: new Date().toISOString().slice(0, 10) }
    persist((s) => ({ ...s, users: [...s.users, user] }))
    pushToast(`User ${user.name} created with ${data.roleId.replaceAll('_', ' ')} role.`)
    return { ok: true, user }
  }, [state.users, persist, pushToast])

  const updateUser = useCallback((id, patch) => {
    persist((s) => ({ ...s, users: s.users.map((u) => u.id === id ? { ...u, ...patch } : u) }))
    pushToast('User details updated.')
  }, [persist, pushToast])

  const toggleUser = useCallback((id) => {
    persist((s) => ({ ...s, users: s.users.map((u) => u.id === id ? { ...u, active: !u.active } : u) }))
    pushToast('User account status updated.')
  }, [persist, pushToast])

  const createProduct = useCallback((data) => {
    const product = { ...data, code: data.code.trim().toUpperCase(), price: Number(data.price || 0), cartonSize: Number(data.cartonSize || 1), reorder: Number(data.reorder || 0), active: data.active !== false }
    persist((st) => ({ ...st, products: [...st.products, product], inventory: [...st.inventory, { sku: product.code, name: product.name, bin: 'UNASSIGNED', available: 0, reserved: 0, incoming: 0, reorder: product.reorder }] }))
    pushToast(`${product.code} added to the catalogue.`)
    return product
  }, [persist, pushToast])

  const updateProduct = useCallback((code, patch) => {
    persist((st) => ({ ...st, products: st.products.map((p) => p.code === code ? { ...p, ...patch } : p) }))
    pushToast('SKU details updated.')
  }, [persist, pushToast])

  const toggleProduct = useCallback((code) => {
    persist((st) => ({ ...st, products: st.products.map((p) => p.code === code ? { ...p, active: !p.active } : p) }))
    pushToast('SKU availability updated.')
  }, [persist, pushToast])

  const adjustInventory = useCallback((sku, delta) => {
    persist((st) => ({ ...st, inventory: st.inventory.map((i) => i.sku === sku ? { ...i, available: i.available + Number(delta) } : i) }))
    pushToast(`Inventory for ${sku} adjusted by ${delta > 0 ? '+' : ''}${delta}.`)
  }, [persist, pushToast])

  const createOrder = useCallback((customer, cart) => {
    const items = cart.map(({ product, qty }) => ({ sku: product.code, name: product.name, qty: Number(qty), price: product.price }))
    const total = items.reduce((sum, item) => sum + item.qty * item.price, 0)
    const order = { id: makeId('ORD'), customerEmail: customer.email, customerName: customer.name, items, total, status: 'Placed', warehouse: 'Pune Central Warehouse', createdAt: new Date().toLocaleString(), shipmentId: null }
    persist((s) => ({
      ...s,
      orders: [order, ...s.orders],
      notifications: [{ id: makeId('N'), target: 'warehouse_manager', message: `New bulk order ${order.id} from ${customer.name}.`, read: false, createdAt: new Date().toLocaleString() }, ...s.notifications],
    }))
    pushToast(`Bulk order ${order.id} placed successfully.`)
    return order
  }, [persist, pushToast])

  const updateOrder = useCallback((orderId, status) => {
    persist((s) => ({ ...s, orders: s.orders.map((o) => o.id === orderId ? { ...o, status } : o) }))
    pushToast(`Order ${orderId} moved to ${status}.`)
  }, [persist, pushToast])

  const reserveStock = useCallback((orderId) => {
    let available = true
    persist((s) => {
      const order = s.orders.find((o) => o.id === orderId)
      if (!order) return s
      const enough = order.items.every((item) => {
        const row = s.inventory.find((i) => i.sku === item.sku)
        return row && row.available >= item.qty
      })
      available = enough
      if (!enough) {
        return { ...s, orders: s.orders.map((o) => o.id === orderId ? { ...o, status: 'Delayed' } : o) }
      }
      const nextInventory = s.inventory.map((row) => {
        const item = order.items.find((i) => i.sku === row.sku)
        return item ? { ...row, available: row.available - item.qty, reserved: row.reserved + item.qty } : row
      })
      return { ...s, inventory: nextInventory, orders: s.orders.map((o) => o.id === orderId ? { ...o, status: 'Reserved' } : o) }
    })
    pushToast(available ? `Stock reserved for ${orderId}.` : `Insufficient stock for ${orderId}; order delayed.`, available ? 'success' : 'error')
    return available
  }, [persist, pushToast])

  const pickPackOrder = useCallback((orderId, step) => {
    const status = step === 'pick' ? 'Picked' : 'Packed'
    persist((s) => ({ ...s, orders: s.orders.map((o) => o.id === orderId ? { ...o, status } : o) }))
    pushToast(`${orderId} marked ${status}.`)
  }, [persist, pushToast])

  const createShipment = useCallback((orderId) => {
    let shipment
    persist((s) => {
      const order = s.orders.find((o) => o.id === orderId)
      if (!order || order.shipmentId) return s
      shipment = { id: makeId('SHP'), orderId, customerName: order.customerName, deliveryEmail: '', deliveryName: '', status: 'Created', eta: 'To be scheduled', proof: false }
      return { ...s, shipments: [shipment, ...s.shipments], orders: s.orders.map((o) => o.id === orderId ? { ...o, status: 'Shipment Created', shipmentId: shipment.id } : o) }
    })
    if (shipment) pushToast(`${shipment.id} created for ${orderId}.`)
    return shipment
  }, [persist, pushToast])

  const assignShipment = useCallback((shipmentId, deliveryUser) => {
    persist((s) => ({
      ...s,
      shipments: s.shipments.map((sh) => sh.id === shipmentId ? { ...sh, deliveryEmail: deliveryUser.email, deliveryName: deliveryUser.name, status: 'Assigned' } : sh),
      notifications: [{ id: makeId('N'), target: 'delivery_partner', targetEmail: deliveryUser.email, message: `Shipment ${shipmentId} assigned to you.`, read: false, createdAt: new Date().toLocaleString() }, ...s.notifications],
    }))
    pushToast(`Shipment ${shipmentId} assigned to ${deliveryUser.name}.`)
  }, [persist, pushToast])

  const updateShipment = useCallback((shipmentId, status) => {
    persist((s) => ({
      ...s,
      shipments: s.shipments.map((sh) => sh.id === shipmentId ? { ...sh, status, proof: status === 'Delivered' ? true : sh.proof } : sh),
      orders: s.orders.map((o) => {
        const sh = s.shipments.find((x) => x.id === shipmentId)
        if (!sh || o.id !== sh.orderId) return o
        const orderStatus = status === 'Delivered' ? 'Delivered' : status === 'Out for delivery' ? 'Out for Delivery' : o.status
        return { ...o, status: orderStatus }
      }),
    }))
    pushToast(`${shipmentId} updated to ${status}.`)
  }, [persist, pushToast])

  const confirmReceipt = useCallback((orderId) => {
    updateOrder(orderId, 'Closed')
  }, [updateOrder])

  const createRestock = useCallback((manufacturer, data) => {
    const restock = { id: makeId('RST'), manufacturerEmail: manufacturer.email, manufacturer: manufacturer.name, ...data, status: 'Submitted', warehouse: 'Pune Central Warehouse', createdAt: new Date().toLocaleString() }
    persist((s) => ({ ...s, restocks: [restock, ...s.restocks], notifications: [{ id: makeId('N'), target: 'warehouse_manager', message: `Restock ${restock.id} submitted by ${manufacturer.name}.`, read: false, createdAt: new Date().toLocaleString() }, ...s.notifications] }))
    pushToast(`${restock.id} submitted for validation.`)
    return restock
  }, [persist, pushToast])

  const receiveRestock = useCallback((restockId) => {
    persist((s) => {
      const restock = s.restocks.find((r) => r.id === restockId)
      if (!restock) return s
      const inventory = s.inventory.map((row) => row.sku === restock.sku ? { ...row, incoming: Math.max(0, row.incoming - Number(restock.qty)), available: row.available + Number(restock.qty) } : row)
      return { ...s, inventory, restocks: s.restocks.map((r) => r.id === restockId ? { ...r, status: 'Received' } : r) }
    })
    pushToast(`${restockId} received and inventory updated.`)
  }, [persist, pushToast])

  const createComplaint = useCallback((customer, data) => {
    const complaint = { id: makeId('CMP'), customerEmail: customer.email, ...data, status: 'Open', createdAt: new Date().toLocaleString() }
    persist((s) => ({ ...s, complaints: [complaint, ...s.complaints], notifications: [{ id: makeId('N'), target: 'admin', message: `New complaint ${complaint.id} was raised.`, read: false, createdAt: new Date().toLocaleString() }, ...s.notifications] }))
    pushToast(`${complaint.id} created.`)
    return complaint
  }, [persist, pushToast])

  const resolveComplaint = useCallback((id) => {
    persist((s) => ({ ...s, complaints: s.complaints.map((c) => c.id === id ? { ...c, status: 'Resolved' } : c) }))
    pushToast('Complaint resolved.')
  }, [persist, pushToast])

  const assignTechnician = useCallback((complaintId, technicianEmail) => {
    const tech = state.users.find((u) => u.email === technicianEmail)
    persist((s) => ({
      ...s,
      complaints: s.complaints.map((c) => c.id === complaintId ? { ...c, status: 'Service Assigned', assignedTo: technicianEmail } : c),
      serviceVisits: [{ id: makeId('SV'), complaintId, customerName: s.users.find((u) => u.email === s.complaints.find((c) => c.id === complaintId)?.customerEmail)?.name || 'Business Customer', technicianEmail, orderId: s.complaints.find((c) => c.id === complaintId)?.orderId || '', status: 'Assigned', assemblyRequired: true, defectFound: false, report: '' }, ...s.serviceVisits],
      notifications: tech ? [{ id: makeId('N'), target: 'technician', targetEmail: technicianEmail, message: `A service visit has been assigned to you for complaint ${complaintId}.`, read: false, createdAt: new Date().toLocaleString() }, ...s.notifications] : s.notifications,
    }))
    pushToast(`Technician assigned for ${complaintId}.`)
  }, [persist, pushToast, state.users])

  const updateService = useCallback((visitId, patch) => {
    persist((s) => ({ ...s, serviceVisits: s.serviceVisits.map((v) => v.id === visitId ? { ...v, ...patch } : v) }))
    pushToast('Service visit updated.')
  }, [persist, pushToast])

  const markNotificationRead = useCallback((id) => {
    persist((s) => ({ ...s, notifications: s.notifications.map((n) => n.id === id ? { ...n, read: true } : n) }))
  }, [persist])

  const value = useMemo(() => ({
    ...state,
    session,
    setSession: setSessionState,
    login,
    logout,
    createUser,
    updateUser,
    toggleUser,
    createProduct,
    updateProduct,
    toggleProduct,
    adjustInventory,
    createOrder,
    updateOrder,
    reserveStock,
    pickPackOrder,
    createShipment,
    assignShipment,
    updateShipment,
    confirmReceipt,
    createRestock,
    receiveRestock,
    createComplaint,
    resolveComplaint,
    assignTechnician,
    updateService,
    markNotificationRead,
    pushToast,
    toast,
  }), [state, session, login, logout, createUser, updateUser, toggleUser, createProduct, updateProduct, toggleProduct, adjustInventory, createOrder, updateOrder, reserveStock, pickPackOrder, createShipment, assignShipment, updateShipment, confirmReceipt, createRestock, receiveRestock, createComplaint, resolveComplaint, assignTechnician, updateService, markNotificationRead, pushToast, toast])

  return <WarexContext.Provider value={value}>{children}</WarexContext.Provider>
}

export function useWarex() {
  const context = useContext(WarexContext)
  if (!context) throw new Error('useWarex must be used inside WarexProvider')
  return context
}
