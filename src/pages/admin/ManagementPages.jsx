import { useState } from 'react'
import { PackagePlus, Truck, Undo2, FileBarChart, CheckCircle2 } from 'lucide-react'
import StatusPill from '../../components/common/StatusPill'
import { useWarex } from '../../context/WarexContext'

export function Manufacturers() {
  const { users, updateUser } = useWarex()
  const makers = users.filter((u) => u.roleId === 'manufacturer')
  return <Generic title="Manufacturers" icon={PackagePlus} subtitle="Manage manufacturer logins and restock participation."><SimpleTable headers={['Name','Email','Access','Action']} rows={makers.map((m) => [m.name, m.email, <StatusPill key={m.id} label={m.active ? 'Active' : 'Inactive'} variant={m.active ? 'green' : 'red'} />, <button key={`${m.id}-b`} onClick={() => updateUser(m.id, { active: !m.active })} className="px-2.5 py-1.5 rounded-md text-xs" style={{ border: '1px solid var(--paper-line)', color: 'var(--text)' }}>{m.active ? 'Disable' : 'Enable'}</button>])} /></Generic>
}

export function Fleet() {
  const [vehicles, setVehicles] = useState([{ id: 'VH-101', reg: 'MH12AB1234', driver: 'Fleet Partner One', status: 'Available' }, { id: 'VH-102', reg: 'MH14CD9876', driver: 'Backup Driver', status: 'On route' }])
  function flip(id) { setVehicles((p) => p.map((v) => v.id === id ? { ...v, status: v.status === 'Available' ? 'On route' : 'Available' } : v)) }
  return <Generic title="Fleet" icon={Truck} subtitle="Monitor delivery vehicles and driver assignments."><SimpleTable headers={['Vehicle','Registration','Driver','Status','Action']} rows={vehicles.map((v) => [v.id, v.reg, v.driver, <StatusPill key={v.id} label={v.status} variant={v.status === 'Available' ? 'green' : 'amber'} />, <button key={`${v.id}-a`} onClick={() => flip(v.id)} className="px-2.5 py-1.5 rounded-md text-xs" style={{ border: '1px solid var(--paper-line)', color: 'var(--text)' }}>Toggle</button>])} /></Generic>
}

export function Returns() {
  const [returns, setReturns] = useState([{ id: 'RET-2026-0041', order: 'ORD-2026-1032', reason: 'Defect', status: 'Open' }, { id: 'RET-2026-0038', order: 'ORD-2026-1014', reason: 'Wrong item', status: 'Approved' }])
  function close(id) { setReturns((p) => p.map((r) => r.id === id ? { ...r, status: 'Closed' } : r)) }
  return <Generic title="Returns" icon={Undo2} subtitle="Review return requests tied to delivered orders."><SimpleTable headers={['Return','Order','Reason','Status','Action']} rows={returns.map((r) => [r.id, r.order, r.reason, <StatusPill key={r.id} label={r.status} variant={r.status === 'Closed' ? 'green' : 'amber'} />, r.status !== 'Closed' ? <button key={`${r.id}-c`} onClick={() => close(r.id)} className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-md text-xs" style={{ background: 'var(--ink)', color: '#fff' }}><CheckCircle2 size={12} /> Close</button> : '—'])} /></Generic>
}

export function Reports() {
  const { users, orders, shipments, inventory, complaints } = useWarex()
  const cards = [{ label: 'Users', value: users.length }, { label: 'Orders', value: orders.length }, { label: 'Shipments', value: shipments.length }, { label: 'SKUs', value: inventory.length }, { label: 'Complaints', value: complaints.length }]
  return <Generic title="Reports" icon={FileBarChart} subtitle="A live frontend summary generated from the current WAREX data layer."><div className="grid grid-cols-2 lg:grid-cols-5 gap-3">{cards.map((c) => <div key={c.label} className="rounded-lg p-4" style={{ background: 'var(--paper-panel)', border: '1px solid var(--paper-line)' }}><div className="text-xs" style={{ color: 'var(--muted)' }}>{c.label}</div><div className="mt-2 text-2xl font-semibold font-mono-data" style={{ color: 'var(--text)' }}>{c.value}</div></div>)}</div><div className="mt-5 rounded-lg p-5" style={{ background: 'var(--paper-panel)', border: '1px solid var(--paper-line)' }}><h2 className="text-sm font-semibold" style={{ color: 'var(--text)' }}>Workflow health</h2><p className="mt-2 text-sm leading-relaxed" style={{ color: 'var(--muted)' }}>The prototype now maintains shared state across roles, so orders, stock, shipments, restocks, complaints and service visits can be demonstrated end-to-end before the backend is connected.</p></div></Generic>
}

function Generic({ title, subtitle, icon: Icon, children }) { return <div><div className="flex items-center gap-2"><Icon size={18} style={{ color: 'var(--accent-dim)' }} /><h1 className="text-xl font-semibold" style={{ color: 'var(--text)' }}>{title}</h1></div><p className="mt-1 text-sm" style={{ color: 'var(--muted)' }}>{subtitle}</p>{children}</div> }
function SimpleTable({ headers, rows }) { return <div className="mt-5 rounded-lg overflow-hidden" style={{ background: 'var(--paper-panel)', border: '1px solid var(--paper-line)' }}><div className="overflow-x-auto"><table className="w-full text-sm"><thead><tr style={{ borderBottom: '1px solid var(--paper-line)' }}>{headers.map((h) => <th key={h} className="text-left px-4 py-2.5 text-xs font-medium" style={{ color: 'var(--muted)' }}>{h}</th>)}</tr></thead><tbody>{rows.map((row, idx) => <tr key={idx} style={{ borderBottom: '1px solid var(--paper-line)' }}>{row.map((cell, i) => <td key={i} className="px-4 py-3" style={{ color: 'var(--text)' }}>{cell}</td>)}</tr>)}</tbody></table></div></div> }
