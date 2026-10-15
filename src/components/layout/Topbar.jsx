
import { useMemo, useState } from 'react'
import {
  Search,
  Bell,
  ChevronDown,
  LogOut,
  Menu,
  Check,
  CheckCheck,
  ArrowUpRight,
  Circle,
} from 'lucide-react'
import { getRole } from '../../lib/roles'
import { useWarex } from '../../context/WarexContext'
import { useNavigate } from 'react-router-dom'

function getNotificationDestination(notification, roleId) {
  const message = String(notification.message || '')
  const text = message.toLowerCase()

  const match = message.match(
    /\b(?:ORD|RST|SHP|CMP|RET|SV)-[A-Z0-9-]+\b/i
  )
  const recordId = match?.[0]

  const roleRoot = `/${roleId}`

  function destination(section = '') {
    const path = section ? `${roleRoot}/${section}` : roleRoot

    // Pass the record identifier to the destination screen.
    return recordId
      ? `${path}?focus=${encodeURIComponent(recordId)}`
      : path
  }

  // Inventory and low-stock alerts.
  if (
    text.includes('low stock') ||
    text.includes('stock alert') ||
    text.includes('stock mismatch')
  ) {
    if (roleId === 'warehouse_manager') {
      return destination('inventory')
    }

    if (roleId === 'admin') {
      return destination('products')
    }
  }

  // Manufacturer restock requests.
  if (text.includes('restock') || recordId?.startsWith('RST-')) {
    if (roleId === 'warehouse_manager') {
      return destination('receiving')
    }

    if (roleId === 'manufacturer') {
      return destination('shipments')
    }

    if (roleId === 'admin') {
      return destination('manufacturers')
    }
  }

  // Complaints and after-sales service visits.
  if (
    text.includes('complaint') ||
    text.includes('service visit') ||
    text.includes('technician') ||
    recordId?.startsWith('CMP-') ||
    recordId?.startsWith('SV-')
  ) {
    if (roleId === 'technician') {
      return destination('service-visits')
    }

    if (roleId === 'admin') {
      return destination('complaints')
    }

    if (roleId === 'business_customer') {
      return destination('returns-complaints')
    }
  }

  // Returns.
  if (text.includes('return') || recordId?.startsWith('RET-')) {
    if (roleId === 'admin') {
      return destination('returns')
    }

    if (roleId === 'business_customer') {
      return destination('returns-complaints')
    }
  }

  // Shipments and delivery updates.
  if (
    text.includes('shipment') ||
    text.includes('delivery') ||
    text.includes('proof of delivery') ||
    recordId?.startsWith('SHP-')
  ) {
    if (roleId === 'delivery_partner') {
      return text.includes('delivered') ||
        text.includes('proof of delivery')
        ? destination('history')
        : destination()
    }

    if (roleId === 'warehouse_manager') {
      return destination('shipments')
    }

    if (roleId === 'admin') {
      return destination('orders')
    }

    if (roleId === 'business_customer') {
      return destination('my-orders')
    }

    if (roleId === 'manufacturer') {
      return destination('shipments')
    }
  }

  // Bulk orders and order-processing tasks.
  if (
    text.includes('order') ||
    recordId?.startsWith('ORD-')
  ) {
    if (roleId === 'warehouse_manager') {
      return destination('pick-pack')
    }

    if (roleId === 'admin') {
      return destination('orders')
    }

    if (roleId === 'business_customer') {
      return destination('my-orders')
    }

    if (roleId === 'manufacturer') {
      return destination('purchase-orders')
    }
  }

  // Keep the notification useful even when its type is unfamiliar.
  return roleRoot
}

export default function Topbar({ session, onMenuClick }) {
  const {
    users,
    products = [],
    orders = [],
    shipments = [],
    notifications,
    markNotificationRead,
    logout,
    pushToast,
  } = useWarex()

  const [menuOpen, setMenuOpen] = useState(false)
  const [notificationOpen, setNotificationOpen] = useState(false)
  const [query, setQuery] = useState('')
  const [markingAllRead, setMarkingAllRead] = useState(false)

  const role = getRole(session.roleId)
  const navigate = useNavigate()

  const visibleNotifications = useMemo(() => {
    const email = session.email?.toLowerCase()

    return notifications
      .filter(
        (notification) =>
          (!notification.target ||
            notification.target === session.roleId) &&
          (!notification.targetEmail ||
            notification.targetEmail.toLowerCase() === email)
      )
      .slice()
      .sort((a, b) => {
        const dateA = new Date(a.createdAt || 0).getTime()
        const dateB = new Date(b.createdAt || 0).getTime()

        return (Number.isFinite(dateB) ? dateB : 0) -
          (Number.isFinite(dateA) ? dateA : 0)
      })
  }, [notifications, session.roleId, session.email])

  const unread = visibleNotifications.filter(
    (notification) => !notification.read
  )

  const matches = useMemo(() => {
    if (!query.trim()) return []
    const q = query.trim().toLowerCase()
    const results = []
    const root = `/${session.roleId}`
    const productPath = ({ admin: `${root}/products`, warehouse_manager: `${root}/inventory`, business_customer: `${root}/browse`, manufacturer: `${root}/shipments` })[session.roleId] || root
    const orderPath = ({ admin: `${root}/orders`, warehouse_manager: `${root}/pick-pack`, business_customer: `${root}/my-orders`, manufacturer: `${root}/purchase-orders`, delivery_partner: `${root}/history`, technician: `${root}/service-visits` })[session.roleId] || root
    const shipmentPath = ({ admin: `${root}/orders`, warehouse_manager: `${root}/shipments`, business_customer: `${root}/my-orders`, manufacturer: `${root}/shipments`, delivery_partner: `${root}/history` })[session.roleId] || root

    if (session.roleId === 'admin') {
      results.push(...users.filter((user) => `${user.name} ${user.email} ${user.roleId}`.toLowerCase().includes(q)).map((user) => ({ type: 'User', label: user.name, sub: user.email, path: `${root}/users` })))
    }
    results.push(...products.filter((product) => `${product.code} ${product.name} ${product.category}`.toLowerCase().includes(q)).slice(0, 4).map((product) => ({ type: 'Product', label: product.name, sub: product.code, path: productPath })))
    results.push(...orders.filter((order) => `${order.id} ${order.customerName} ${order.status}`.toLowerCase().includes(q)).slice(0, 4).map((order) => ({ type: 'Order', label: order.id, sub: `${order.customerName} · ${order.status}`, path: orderPath })))
    results.push(...shipments.filter((shipment) => `${shipment.id} ${shipment.trackingNumber || ''} ${shipment.status} ${shipment.customerName}`.toLowerCase().includes(q)).slice(0, 4).map((shipment) => ({ type: 'Shipment', label: shipment.id, sub: `${shipment.status} · ${shipment.trackingNumber || 'No tracking number'}`, path: shipmentPath })))
    return results.slice(0, 7)
  }, [query, users, products, orders, shipments, session.roleId])

  function signOut() {
    setMenuOpen(false)
    setNotificationOpen(false)
    logout()
  }

  async function handleNotificationClick(notification) {
    // Mark it read without removing it from the notification list.
    if (!notification.read) {
      try {
        await markNotificationRead(notification.id)
      } catch (error) {
        console.error('Could not mark notification as read:', error)
      }
    }

    // Navigate even if marking as read failed.
    setNotificationOpen(false)

    const path = getNotificationDestination(
      notification,
      session.roleId
    )

    navigate(path)
  }

  async function handleMarkAllRead() {
    if (markingAllRead || unread.length === 0) return

    setMarkingAllRead(true)

    try {
      const results = await Promise.all(
        unread.map((notification) =>
          markNotificationRead(notification.id)
        )
      )

      const failedCount = results.filter(
        (result) => result === false
      ).length

      if (failedCount > 0) {
        pushToast(
          `${failedCount} notification(s) could not be marked as read.`,
          'error'
        )
      }
    } finally {
      setMarkingAllRead(false)
    }
  }

  return (
    <header
      className="app-topbar sticky top-0 z-20 flex items-center gap-3 px-4 md:px-6 py-3"
      style={{
        background: 'var(--paper-panel)',
        borderBottom: '1px solid var(--paper-line)',
      }}
    >
      <button
        type="button"
        className="md:hidden"
        onClick={onMenuClick}
        aria-label="Open menu"
        style={{ color: 'var(--text)' }}
      >
        <Menu size={20} />
      </button>

      {/* Search */}
      <div className="flex-1 max-w-lg relative">
        <Search
          size={15}
          className="absolute left-3 top-1/2 -translate-y-1/2"
          style={{ color: 'var(--muted)' }}
        />

        <input
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          type="text"
          aria-label="Search WAREX records"
          placeholder="Search users, SKUs, orders…"
          className="w-full pl-9 pr-3 py-2 text-sm rounded-md outline-none"
          style={{
            background: 'var(--paper)',
            border: '1px solid var(--paper-line)',
            color: 'var(--text)',
          }}
        />

        {query.trim() && (
          <div
            className="absolute left-0 right-0 mt-1 rounded-md overflow-hidden shadow-lg z-30"
            style={{
              background: 'var(--paper-panel)',
              border: '1px solid var(--paper-line)',
            }}
          >
            {matches.length === 0 && <div className="px-3 py-3 text-xs" style={{ color: 'var(--muted)' }}>No matching WAREX records found.</div>}
            {matches.map((item) => (
              <button
                key={`${item.type}-${item.label}`}
                type="button"
                onClick={() => {
                  navigate(item.path)
                  setQuery('')
                }}
                className="w-full text-left px-3 py-2.5 hover:opacity-80"
                style={{
                  borderBottom: '1px solid var(--paper-line)',
                }}
              >
                <div
                  className="text-xs font-medium"
                  style={{ color: 'var(--text)' }}
                >
                  {item.label}
                </div>

                <div
                  className="text-[11px]"
                  style={{ color: 'var(--muted)' }}
                >
                  {item.type} · {item.sub}
                </div>
              </button>
            ))}
          </div>
        )}
      </div>

      <div className="flex-1" />

      {/* Notification centre */}
      <div className="relative">
        <button
          type="button"
          onClick={() => setNotificationOpen((open) => !open)}
          className="relative p-2 rounded-md"
          style={{
            color: notificationOpen ? 'var(--text)' : 'var(--muted)',
          }}
          aria-label="Notifications"
          aria-expanded={notificationOpen}
        >
          <Bell size={18} />

          {unread.length > 0 && (
            <span
              className="absolute -right-0.5 -top-0.5 min-w-4 h-4 px-1 rounded-full text-[9px] flex items-center justify-center font-semibold"
              style={{
                background: 'var(--accent)',
                color: '#fff',
              }}
            >
              {unread.length > 9 ? '9+' : unread.length}
            </span>
          )}
        </button>

        {notificationOpen && (
          <div
            className="absolute right-0 mt-1 w-80 sm:w-96 rounded-lg overflow-hidden shadow-lg z-50"
            style={{
              background: 'var(--paper-panel)',
              border: '1px solid var(--paper-line)',
            }}
          >
            <div
              className="px-3 py-3 flex items-center justify-between gap-2"
              style={{
                borderBottom: '1px solid var(--paper-line)',
              }}
            >
              <div>
                <div
                  className="text-sm font-medium"
                  style={{ color: 'var(--text)' }}
                >
                  Notifications
                </div>

                <div
                  className="text-xs mt-1"
                  style={{ color: 'var(--muted)' }}
                >
                  {unread.length} unread · {visibleNotifications.length} total
                </div>
              </div>

              {unread.length > 0 && (
                <button
                  type="button"
                  disabled={markingAllRead}
                  onClick={handleMarkAllRead}
                  className="flex items-center gap-1 text-[11px] px-2 py-1.5 rounded-md hover:opacity-75 disabled:opacity-60"
                  style={{
                    color: 'var(--text)',
                    border: '1px solid var(--paper-line)',
                  }}
                >
                  <CheckCheck size={13} />
                  {markingAllRead ? 'Saving…' : 'Mark all read'}
                </button>
              )}
            </div>

            <div className="max-h-96 overflow-y-auto">
              {visibleNotifications.length === 0 && (
                <div
                  className="p-6 text-center text-xs"
                  style={{ color: 'var(--muted)' }}
                >
                  No notifications yet.
                </div>
              )}

              {visibleNotifications.map((notification) => (
                <button
                  key={notification.dbId || notification.id}
                  type="button"
                  onClick={() => handleNotificationClick(notification)}
                  className="w-full text-left px-3 py-3 transition-colors hover:opacity-80"
                  style={{
                    borderBottom: '1px solid var(--paper-line)',
                    background: notification.read
                      ? 'transparent'
                      : 'var(--paper)',
                  }}
                >
                  <div className="flex items-start gap-2.5">
                    <div className="pt-0.5">
                      {notification.read ? (
                        <Check
                          size={15}
                          style={{ color: 'var(--muted)' }}
                        />
                      ) : (
                        <Circle
                          size={10}
                          fill="var(--accent)"
                          style={{ color: 'var(--accent)' }}
                        />
                      )}
                    </div>

                    <div className="flex-1 min-w-0">
                      <div
                        className="text-xs leading-relaxed"
                        style={{
                          color: 'var(--text)',
                          fontWeight: notification.read ? 400 : 600,
                        }}
                      >
                        {notification.message}
                      </div>

                      <div
                        className="mt-1.5 text-[10px]"
                        style={{ color: 'var(--muted)' }}
                      >
                        {notification.createdAt || 'Recently'}
                        {' · '}
                        {notification.read
                          ? 'Read · Click to open'
                          : 'Unread · Click to open task'}
                      </div>
                    </div>
                  </div>
                </button>
              ))}
            </div>

            <div
              className="px-3 py-2 text-[10px]"
              style={{
                color: 'var(--muted)',
                borderTop: '1px solid var(--paper-line)',
              }}
            >
              Read notifications stay here for reference.
            </div>
          </div>
        )}
      </div>

      {/* User menu */}
      <div className="relative">
        <button
          type="button"
          onClick={() => setMenuOpen((open) => !open)}
          className="flex items-center gap-2 pl-2 pr-1 py-1 rounded-md"
          style={{ border: '1px solid var(--paper-line)' }}
          aria-expanded={menuOpen}
        >
          <div
            className="w-7 h-7 rounded-full flex items-center justify-center text-xs font-semibold"
            style={{
              background: 'var(--ink)',
              color: '#fff',
            }}
          >
            {session.name?.[0]?.toUpperCase() || role.label[0]}
          </div>

          <span
            className="hidden sm:block text-sm"
            style={{ color: 'var(--text)' }}
          >
            {role.label}
          </span>

          <ChevronDown
            size={14}
            style={{ color: 'var(--muted)' }}
          />
        </button>

        {menuOpen && (
          <div
            className="absolute right-0 mt-1 w-56 rounded-md overflow-hidden shadow-lg z-30"
            style={{
              background: 'var(--paper-panel)',
              border: '1px solid var(--paper-line)',
            }}
          >
            <div
              className="px-3 py-2.5"
              style={{
                borderBottom: '1px solid var(--paper-line)',
              }}
            >
              <div
                className="text-xs font-medium"
                style={{ color: 'var(--text)' }}
              >
                {session.name}
              </div>

              <div
                className="text-[11px] mt-0.5 truncate"
                style={{ color: 'var(--muted)' }}
              >
                {session.email}
              </div>
            </div>

            <div
              className="px-3 py-2 text-[11px] flex items-center gap-1.5"
              style={{ color: 'var(--muted)' }}
            >
              <Check
                size={12}
                style={{ color: 'var(--signal-green)' }}
              />
              Role assigned by Main Admin
            </div>

            <button
              type="button"
              onClick={signOut}
              className="w-full flex items-center gap-2 px-3 py-2.5 text-sm hover:opacity-80"
              style={{ color: 'var(--signal-red)' }}
            >
              <LogOut size={14} />
              Sign out
            </button>

            <div
              className="px-3 py-2 text-[10px] flex items-center gap-1"
              style={{
                color: 'var(--muted)',
                borderTop: '1px solid var(--paper-line)',
              }}
            >
              Live backend session
              <ArrowUpRight size={11} />
            </div>
          </div>
        )}
      </div>
    </header>
  )
}
