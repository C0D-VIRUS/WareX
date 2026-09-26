import { getRole } from '../lib/roles'
import { Activity, AlertTriangle, ArrowRight, Boxes, CheckCircle2, ClipboardList, PackageCheck, Truck, Users, Wrench } from 'lucide-react'
import { Link } from 'react-router-dom'
import { useWarex } from '../context/WarexContext'

function MetricCard({ icon: Icon, label, value, hint }) {
  return <div className="rounded-lg p-4" style={{ background: 'var(--paper-panel)', border: '1px solid var(--paper-line)' }}><div className="flex items-center justify-between"><div className="text-xs" style={{ color: 'var(--muted)' }}>{label}</div><Icon size={15} style={{ color: 'var(--accent-dim)' }} /></div><div className="mt-1.5 text-2xl font-semibold font-mono-data" style={{ color: 'var(--text)' }}>{value}</div><div className="mt-1 text-xs" style={{ color: 'var(--muted)' }}>{hint}</div></div>
}

function QuickAction({ to, icon: Icon, title, text }) {
  return <Link to={to} className="rounded-lg p-4 transition hover:-translate-y-0.5" style={{ background: 'var(--paper-panel)', border: '1px solid var(--paper-line)' }}><div className="flex items-center justify-between"><Icon size={17} style={{ color: 'var(--accent-dim)' }} /><ArrowRight size={14} style={{ color: 'var(--muted)' }} /></div><div className="mt-3 text-sm font-medium" style={{ color: 'var(--text)' }}>{title}</div><div className="mt-1 text-xs leading-relaxed" style={{ color: 'var(--muted)' }}>{text}</div></Link>
}

export default function Overview({ session }) {
  const role = getRole(session.roleId)
  const { users, products, inventory, orders, shipments, restocks, complaints, serviceVisits } = useWarex()
  const activeOrders = orders.filter((o) => !['Closed','Delivered'].includes(o.status)).length
  const lowStock = inventory.filter((i) => i.available <= i.reorder).length
  const unreadComplaints = complaints.filter((c) => c.status !== 'Resolved').length
  const pendingRestocks = restocks.filter((r) => r.status !== 'Received').length
  const assignedService = serviceVisits.filter((v) => v.status !== 'Completed').length

  const common = {
    admin: [
      { icon: Users, label: 'Active users', value: users.filter((u) => u.active).length, hint: `${users.length} registered accounts` },
      { icon: ClipboardList, label: 'Orders in flow', value: activeOrders, hint: `${orders.length} total orders` },
      { icon: Truck, label: 'Shipments', value: shipments.length, hint: `${shipments.filter((s) => s.status !== 'Delivered').length} still active` },
      { icon: AlertTriangle, label: 'Open complaints', value: unreadComplaints, hint: 'Review service cases' },
    ],
    manufacturer: [
      { icon: PackageCheck, label: 'Pending restocks', value: pendingRestocks, hint: 'Awaiting warehouse receipt' },
      { icon: Boxes, label: 'SKUs supplied', value: products.filter((p) => p.active).length, hint: 'Active catalogue' },
      { icon: Activity, label: 'Open purchase orders', value: 2, hint: '1 needs acceptance' },
      { icon: TrendingIcon, label: 'Sell-through signal', value: '72%', hint: 'Current movement view' },
    ],
    warehouse_manager: [
      { icon: ClipboardList, label: 'Orders to process', value: activeOrders, hint: 'Reserve → pick → pack' },
      { icon: PackageCheck, label: 'Pending restocks', value: pendingRestocks, hint: 'Receive incoming stock' },
      { icon: Boxes, label: 'Low-stock SKUs', value: lowStock, hint: 'At/below reorder level' },
      { icon: Truck, label: 'Shipments', value: shipments.filter((s) => s.status !== 'Delivered').length, hint: 'Need assignment/dispatch' },
    ],
    delivery_partner: [
      { icon: Truck, label: 'Assigned shipments', value: shipments.filter((s) => s.deliveryEmail === session.email).length, hint: 'Your current run' },
      { icon: PackageCheck, label: 'Delivered', value: shipments.filter((s) => s.deliveryEmail === session.email && s.status === 'Delivered').length, hint: 'Proof captured' },
      { icon: Activity, label: 'Out for delivery', value: shipments.filter((s) => s.deliveryEmail === session.email && s.status === 'Out for delivery').length, hint: 'Active route' },
      { icon: CheckCircle2, label: 'Proof pending', value: shipments.filter((s) => s.deliveryEmail === session.email && !s.proof).length, hint: 'Close these deliveries' },
    ],
    business_customer: [
      { icon: ClipboardList, label: 'My active orders', value: orders.filter((o) => o.customerEmail === session.email && !['Closed','Delivered'].includes(o.status)).length, hint: 'In the WAREX flow' },
      { icon: Truck, label: 'Shipments', value: shipments.filter((s) => orders.some((o) => o.customerEmail === session.email && o.shipmentId === s.id)).length, hint: 'Track delivery status' },
      { icon: AlertTriangle, label: 'My complaints', value: complaints.filter((c) => c.customerEmail === session.email && c.status !== 'Resolved').length, hint: 'Open cases' },
      { icon: Boxes, label: 'Reorder-ready SKUs', value: 6, hint: 'Based on the catalogue' },
    ],
    technician: [
      { icon: Wrench, label: 'Assigned visits', value: serviceVisits.filter((v) => v.technicianEmail === session.email && v.status !== 'Completed').length, hint: 'Service queue' },
      { icon: CheckCircle2, label: 'Completed visits', value: serviceVisits.filter((v) => v.technicianEmail === session.email && v.status === 'Completed').length, hint: 'Reports submitted' },
      { icon: AlertTriangle, label: 'Defect cases', value: serviceVisits.filter((v) => v.technicianEmail === session.email && v.defectFound).length, hint: 'Need repair action' },
      { icon: PackageCheck, label: 'Assembly cases', value: serviceVisits.filter((v) => v.technicianEmail === session.email && v.assemblyRequired).length, hint: 'Need installation' },
    ],
  }

  const metrics = common[session.roleId] || common.admin
  const links = {
    admin: [['users','User & Roles','Create accounts and assign WAREX roles.',Users], ['orders','Orders & Shipments','Monitor the full order-to-delivery workflow.',ClipboardList], ['complaints','Complaints','Assign technicians and resolve cases.',Wrench]],
    manufacturer: [['shipments','Restock Shipments','Submit incoming stock with procurement documents.',PackagePlusIcon], ['sell-through','Sell-Through','Review current product movement.',Activity], ['purchase-orders','Purchase Orders','Accept and follow open purchase orders.',ClipboardList]],
    warehouse_manager: [['pick-pack','Pick & Pack','Process orders through reserve, pick and pack.',PackageCheck], ['shipments','Shipments','Assign delivery partners to packed orders.',Truck], ['receiving','Receiving','Receive restock shipments and update stock.',Boxes]],
    delivery_partner: [['','Today\'s Run','Start deliveries and capture proof of delivery.',Truck], ['history','Shipment History','Review completed deliveries.',CheckCircle2]],
    business_customer: [['browse','Browse & Order','Build and submit a bulk order.',Boxes], ['my-orders','My Orders','Track your order and shipment lifecycle.',Truck], ['returns-complaints','Returns & Complaints','Raise an issue and follow service.',AlertTriangle]],
    technician: [['service-visits','Service Visits','Accept, inspect, assemble and repair.',Wrench], ['service-reports','Service Reports','Review your completed service reports.',CheckCircle2]],
  }
  const qs = links[session.roleId] || links.admin

  return <div><div className="flex items-center gap-2"><role.icon size={18} style={{ color: 'var(--accent-dim)' }} /><h1 className="text-xl font-semibold" style={{ color: 'var(--text)' }}>{session.name}'s {role.label} workspace</h1></div><p className="mt-1 text-sm" style={{ color: 'var(--muted)' }}>Interactive WAREX frontend state is shared across roles so the complete workflow can be demonstrated before backend integration.</p><div className="mt-5 grid grid-cols-2 lg:grid-cols-4 gap-3">{metrics.map((m) => <MetricCard key={m.label} {...m} />)}</div><div className="mt-6"><div className="flex items-center justify-between"><h2 className="text-sm font-semibold" style={{ color: 'var(--text)' }}>Quick actions</h2><span className="text-[11px]" style={{ color: 'var(--muted)' }}>Built around the WAREX sequence</span></div><div className="mt-3 grid md:grid-cols-3 gap-3">{qs.map(([path,title,text,Icon]) => <QuickAction key={title} to={`/${session.roleId}${path ? `/${path}` : ''}`} icon={Icon} title={title} text={text} />)}</div></div></div>
}

function TrendingIcon(props) { return <Activity {...props} /> }
function PackagePlusIcon(props) { return <PackageCheck {...props} /> }
