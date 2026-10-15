import { useMemo } from 'react'
import { Activity, AlertTriangle, ArrowRight, Boxes, CheckCircle2, ClipboardList, Clock3, PackageCheck, RefreshCw, Truck, Users, Wrench } from 'lucide-react'
import { Link } from 'react-router-dom'
import { getRole } from '../lib/roles'
import { useWarex } from '../context/WarexContext'

function MetricCard({ icon: Icon, label, value, hint, tone = 'orange' }) {
  return <article className="metric-card"><div className="metric-card-top"><span className="metric-label">{label}</span><span className={`metric-icon metric-icon-${tone}`}><Icon size={17} /></span></div><strong>{value}</strong><span className="metric-note">{hint}</span></article>
}

function QuickAction({ to, icon: Icon, title, text }) {
  return <Link to={to} className="quick-action-card"><span className="quick-action-icon"><Icon size={18} /></span><span className="quick-action-copy"><strong>{title}</strong><small>{text}</small></span><ArrowRight size={16} className="quick-action-arrow" /></Link>
}

function shortDate(value) {
  if (!value) return 'Date unavailable'
  const parsed = new Date(value)
  return Number.isNaN(parsed.getTime()) ? String(value) : parsed.toLocaleDateString(undefined, { day: 'numeric', month: 'short' })
}

export default function Overview({ session }) {
  const role = getRole(session.roleId)
  const { users = [], products = [], inventory = [], orders = [], shipments = [], restocks = [], complaints = [], serviceVisits = [], notifications = [], sellThrough = [], dataLoading, refreshData, pushToast } = useWarex()
  const activeOrders = orders.filter((order) => !['Closed', 'Delivered'].includes(order.status))
  const lowStockRows = inventory.filter((item) => Number(item.reorder) > 0 && Number(item.available) <= Number(item.reorder)).sort((a, b) => Number(a.available) - Number(b.available)).slice(0, 5)
  const activeShipments = shipments.filter((shipment) => !['Delivered', 'Closed'].includes(shipment.status))
  const openComplaints = complaints.filter((item) => !['Resolved', 'Closed'].includes(item.status))
  const pendingRestocks = restocks.filter((item) => !['Received', 'Rejected'].includes(item.status))
  const pendingVisits = serviceVisits.filter((visit) => visit.status !== 'Completed')
  const unreadNotifications = notifications.filter((notification) => !notification.read).length

  const common = {
    admin: [
      { icon: Users, label: 'Active users', value: users.filter((user) => user.active).length, hint: `${users.length} registered accounts`, tone: 'slate' },
      { icon: ClipboardList, label: 'Orders in flow', value: activeOrders.length, hint: `${orders.length} total orders`, tone: 'orange' },
      { icon: Truck, label: 'Active shipments', value: activeShipments.length, hint: `${shipments.length} shipments recorded`, tone: 'blue' },
      { icon: AlertTriangle, label: 'Open service cases', value: openComplaints.length, hint: 'Complaints needing attention', tone: 'red' },
    ],
    manufacturer: [
      { icon: PackageCheck, label: 'Pending restocks', value: pendingRestocks.length, hint: 'Awaiting warehouse receipt', tone: 'orange' },
      { icon: Boxes, label: 'Active SKUs', value: products.filter((product) => product.active).length, hint: 'Products in the catalogue', tone: 'blue' },
      { icon: Activity, label: 'Units sold', value: sellThrough.reduce((sum, item) => sum + Number(item.unitsSold || 0), 0), hint: 'From shipped / delivered orders', tone: 'slate' },
      { icon: PackageCheck, label: 'Supplier records', value: restocks.length, hint: 'Restock shipments in the database', tone: 'green' },
    ],
    warehouse_manager: [
      { icon: ClipboardList, label: 'Orders to process', value: activeOrders.length, hint: 'Reserve → pick → pack', tone: 'orange' },
      { icon: PackageCheck, label: 'Incoming restocks', value: pendingRestocks.length, hint: 'Verify and receive stock', tone: 'blue' },
      { icon: Boxes, label: 'Low-stock records', value: lowStockRows.length, hint: 'At or below reorder level', tone: 'red' },
      { icon: Truck, label: 'Active shipments', value: activeShipments.length, hint: 'Assignment and dispatch', tone: 'green' },
    ],
    delivery_partner: [
      { icon: Truck, label: 'Assigned shipments', value: shipments.filter((item) => item.deliveryEmail === session.email && !['Delivered', 'Closed'].includes(item.status)).length, hint: 'Your active delivery queue', tone: 'orange' },
      { icon: PackageCheck, label: 'Delivered', value: shipments.filter((item) => item.deliveryEmail === session.email && ['Delivered', 'Closed'].includes(item.status)).length, hint: 'Handover completed', tone: 'green' },
      { icon: Activity, label: 'Out for delivery', value: shipments.filter((item) => item.deliveryEmail === session.email && item.status === 'Out for delivery').length, hint: 'Active route', tone: 'blue' },
      { icon: ClipboardList, label: 'Proof pending', value: shipments.filter((item) => item.deliveryEmail === session.email && item.status === 'Out for delivery' && !item.proof).length, hint: 'Capture proof before completion', tone: 'red' },
    ],
    business_customer: [
      { icon: ClipboardList, label: 'My active orders', value: orders.filter((item) => item.customerEmail === session.email && !['Closed', 'Delivered'].includes(item.status)).length, hint: 'Orders in the WAREX flow', tone: 'orange' },
      { icon: Truck, label: 'My shipments', value: shipments.filter((shipment) => orders.some((order) => order.customerEmail === session.email && order.shipmentId === shipment.id)).length, hint: 'Track dispatch and delivery', tone: 'blue' },
      { icon: AlertTriangle, label: 'My open cases', value: openComplaints.filter((item) => item.customerEmail === session.email).length, hint: 'Complaints needing attention', tone: 'red' },
      { icon: Boxes, label: 'Available SKUs', value: products.filter((product) => product.active).length, hint: 'Active catalogue products', tone: 'green' },
    ],
    technician: [
      { icon: Wrench, label: 'Assigned visits', value: pendingVisits.filter((item) => item.technicianEmail === session.email).length, hint: 'Your service queue', tone: 'orange' },
      { icon: CheckCircle2, label: 'Completed visits', value: serviceVisits.filter((item) => item.technicianEmail === session.email && item.status === 'Completed').length, hint: 'Reports submitted', tone: 'green' },
      { icon: AlertTriangle, label: 'Defect cases', value: serviceVisits.filter((item) => item.technicianEmail === session.email && item.defectFound).length, hint: 'Repair follow-up', tone: 'red' },
      { icon: PackageCheck, label: 'Assembly cases', value: serviceVisits.filter((item) => item.technicianEmail === session.email && item.assemblyRequired && item.status !== 'Completed').length, hint: 'Installation required', tone: 'blue' },
    ],
  }

  const links = {
    admin: [['users', 'User & roles', 'Manage accounts and access', Users], ['orders', 'Orders & shipments', 'Follow fulfilment end to end', ClipboardList], ['complaints', 'Service desk', 'Resolve complaints and assign technicians', Wrench]],
    manufacturer: [['shipments', 'Restock shipments', 'Submit incoming stock', PackageCheck], ['sell-through', 'Sell-through', 'Review product movement', Activity], ['purchase-orders', 'Purchase orders', 'Review purchasing activity', ClipboardList]],
    warehouse_manager: [['pick-pack', 'Pick & pack', 'Reserve, pick and pack orders', PackageCheck], ['shipments', 'Shipments', 'Assign and dispatch vehicles', Truck], ['receiving', 'Receiving', 'Receive and reconcile stock', Boxes]],
    delivery_partner: [['', "Today's run", 'Record delivery progress and proof', Truck], ['history', 'Shipment history', 'Review completed deliveries', CheckCircle2]],
    business_customer: [['browse', 'Browse & order', 'Build a bulk purchase order', Boxes], ['my-orders', 'My orders', 'Track fulfilment status', Truck], ['returns-complaints', 'Returns & complaints', 'Get after-sales support', AlertTriangle]],
    technician: [['service-visits', 'Service visits', 'Inspect, assemble and repair', Wrench], ['service-reports', 'Service reports', 'Review completed service work', CheckCircle2]],
  }
  const metrics = common[session.roleId] || common.admin
  const orderPath = ({ admin: 'orders', manufacturer: 'purchase-orders', warehouse_manager: 'pick-pack', delivery_partner: 'history', business_customer: 'my-orders', technician: 'service-visits' })[session.roleId] || 'orders'
  async function handleRefresh() { try { await refreshData() } catch (error) { pushToast(`Could not refresh live data: ${error.message}`, 'error') } }
  const quickLinks = links[session.roleId] || links.admin
  const canSeeOrders = ['admin', 'warehouse_manager', 'business_customer'].includes(session.roleId)
  const recentOrders = useMemo(() => orders.slice(0, 5), [orders])
  const attentionCount = session.roleId === 'warehouse_manager' ? lowStockRows.length + pendingRestocks.length : session.roleId === 'technician' ? pendingVisits.length : session.roleId === 'delivery_partner' ? shipments.filter((item) => item.deliveryEmail === session.email && item.status !== 'Delivered').length : openComplaints.length + pendingRestocks.length

  return <div className="page-stack">
    <section className="dashboard-hero">
      <div className="dashboard-hero-content"><div className="hero-overline"><span className="hero-mark" /> WAREX OPERATIONS CONSOLE <span className="hero-divider" /> {role.label.toUpperCase()}</div><h1>Good to see you, <span>{session.name?.split(' ')[0] || 'there'}.</span></h1><p>Your {role.label.toLowerCase()} workspace brings orders, inventory and fulfilment into one clear operational view.</p><div className="hero-actions"><button className="hero-refresh" onClick={handleRefresh} disabled={dataLoading}><RefreshCw size={15} className={dataLoading ? 'animate-spin' : ''} /> {dataLoading ? 'Syncing data…' : 'Refresh live data'}</button><span className="hero-status"><span className="live-indicator" /> {dataLoading ? 'Sync in progress' : 'Connected workspace'}</span></div></div>
      <div className="hero-visual" aria-hidden="true"><div className="hero-orbit hero-orbit-one" /><div className="hero-orbit hero-orbit-two" /><div className="hero-core"><Boxes size={34} /></div><div className="hero-float hero-float-one"><Truck size={17} /><span>Dispatch</span></div><div className="hero-float hero-float-two"><PackageCheck size={17} /><span>Fulfilment</span></div><div className="hero-float hero-float-three"><Activity size={17} /><span>Inventory</span></div></div>
      <div className="hero-footer"><span><Clock3 size={13} /> Updated from your WAREX database</span><span className="hero-footer-right">{unreadNotifications} unread notification{unreadNotifications === 1 ? '' : 's'}</span></div>
    </section>

    <section><div className="section-heading"><div><h2>Operational snapshot</h2><p>Live totals for the role and records available to your account.</p></div><span className="count-chip">{metrics.length} key metrics</span></div><div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-3">{metrics.map((metric) => <MetricCard key={metric.label} {...metric} />)}</div></section>

    <section><div className="section-heading"><div><h2>Quick actions</h2><p>Jump straight into the tasks you use most.</p></div><span className="count-chip">{quickLinks.length} shortcuts</span></div><div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3">{quickLinks.map(([path, title, description, Icon]) => <QuickAction key={title} to={`/${session.roleId}${path ? `/${path}` : ''}`} icon={Icon} title={title} text={description} />)}</div></section>

    <section className="grid grid-cols-1 xl:grid-cols-5 gap-4 dashboard-bottom">
      {canSeeOrders && <div className="panel-card xl:col-span-3"><div className="panel-heading"><div><h2>Order pipeline</h2><p>How active orders are moving through the system.</p></div><span className="panel-heading-icon"><Activity size={17} /></span></div><div className="pipeline-list">{[
        ['New orders', orders.filter((item) => ['Placed', 'Confirmed'].includes(item.status)).length, 'var(--accent)'],
        ['Picking & packing', orders.filter((item) => ['Picked', 'Packed'].includes(item.status)).length, '#4479a8'],
        ['In transit', orders.filter((item) => ['Out for Delivery', 'Out for delivery'].includes(item.status)).length, '#278765'],
        ['Completed', orders.filter((item) => ['Delivered', 'Closed'].includes(item.status)).length, '#64748b'],
      ].map(([label, value, color]) => <div className="pipeline-row" key={label}><div className="pipeline-label"><span>{label}</span><strong>{value}</strong></div><div className="pipeline-track"><span style={{ width: `${orders.length ? Math.max(value ? 5 : 0, (value / orders.length) * 100) : 0}%`, background: color }} /></div></div>)}</div><div className="panel-footnote"><span>{activeOrders.length} active order{activeOrders.length === 1 ? '' : 's'} need continued attention</span><Link to={`/${session.roleId}/${orderPath}`}>View records <ArrowRight size={13} /></Link></div></div>}
      <div className={`panel-card ${canSeeOrders ? 'xl:col-span-2' : 'xl:col-span-5'}`}><div className="panel-heading"><div><h2>{session.roleId === 'warehouse_manager' ? 'Stock watch' : 'Needs attention'}</h2><p>{session.roleId === 'warehouse_manager' ? 'Products at or below their reorder point.' : 'A quick view of outstanding work.'}</p></div><span className="panel-heading-icon panel-heading-icon-warn"><AlertTriangle size={17} /></span></div>
        {session.roleId === 'warehouse_manager' ? <div className="attention-list">{lowStockRows.map((item) => <div className="attention-row" key={`${item.warehouseId}-${item.sku}`}><div className="attention-product"><strong>{item.name}</strong><small>{item.sku} · {item.bin}</small></div><span className="stock-count">{item.available}<small> left</small></span></div>)}{lowStockRows.length === 0 && <div className="empty-inline">No inventory records are currently below their reorder threshold.</div>}</div> : <div className="attention-summary"><div className="attention-number">{attentionCount}</div><div><strong>Items may need follow-up</strong><p>{session.roleId === 'delivery_partner' ? 'Check your assigned route and capture proof for each completed handover.' : session.roleId === 'technician' ? 'Review assigned visits and update service reports after each visit.' : 'Review pending restocks, open complaints and operational notifications.'}</p></div></div>}
        <div className="panel-footnote"><span>{pendingRestocks.length} pending restock{pendingRestocks.length === 1 ? '' : 's'}</span><span>{openComplaints.length} open case{openComplaints.length === 1 ? '' : 's'}</span></div>
      </div>
    </section>

    {canSeeOrders && <section className="panel-card"><div className="panel-heading"><div><h2>Recent orders</h2><p>Latest order records available in your workspace.</p></div><Link className="panel-link" to={`/${session.roleId}/${orderPath}`}>Open order view <ArrowRight size={13} /></Link></div><div className="table-shell table-shell-inner"><div className="overflow-x-auto"><table className="data-table"><thead><tr>{['Order','Customer','Warehouse','Created','Status','Total'].map((heading) => <th key={heading}>{heading}</th>)}</tr></thead><tbody>{recentOrders.map((order) => <tr key={order.id}><td className="record-id">{order.id}</td><td>{order.customerName}</td><td>{order.warehouse}</td><td>{shortDate(order.createdAt)}</td><td><span className={`status-dot-label ${['Delivered', 'Closed'].includes(order.status) ? 'status-done' : order.status === 'Delayed' ? 'status-alert' : ''}`}><span />{order.status}</span></td><td>₹{Number(order.total || 0).toLocaleString('en-IN')}</td></tr>)}{recentOrders.length === 0 && <tr><td colSpan={6}><div className="empty-inline">No orders have been created yet.</div></td></tr>}</tbody></table></div></div></section>}
  </div>
}
