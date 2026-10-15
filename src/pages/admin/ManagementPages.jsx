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
  const { vehicles = [], createVehicle, updateVehicleStatus, deliveryRuns = [] } = useWarex()
  const [formOpen, setFormOpen] = useState(false)
  const [saving, setSaving] = useState(false)
  const [formError, setFormError] = useState('')
  const [form, setForm] = useState({ registrationNo: '', vehicleType: 'Delivery Van', capacity: '1200', maxWeightKg: '1200', maxLengthCm: '300', maxWidthCm: '160', maxHeightCm: '160', operatingCostPerKm: '12', energyUsePerKm: '0.18', averageSpeedKmph: '35' })

  async function submit(event) {
    event.preventDefault()
    setFormError('')
    setSaving(true)
    const ok = await createVehicle({ ...form, capacity: Number(form.capacity), maxWeightKg: Number(form.maxWeightKg), maxLengthCm: Number(form.maxLengthCm), maxWidthCm: Number(form.maxWidthCm), maxHeightCm: Number(form.maxHeightCm), operatingCostPerKm: Number(form.operatingCostPerKm), energyUsePerKm: Number(form.energyUsePerKm), averageSpeedKmph: Number(form.averageSpeedKmph) })
    setSaving(false)
    if (ok) {
      setFormOpen(false)
      setForm({ registrationNo: '', vehicleType: 'Delivery Van', capacity: '1200', maxWeightKg: '1200', maxLengthCm: '300', maxWidthCm: '160', maxHeightCm: '160', operatingCostPerKm: '12', energyUsePerKm: '0.18', averageSpeedKmph: '35' })
    } else setFormError('Vehicle was not saved. Review the error notification and check the registration number and specifications.')
  }

  const available = vehicles.filter((vehicle) => vehicle.status === 'AVAILABLE').length
  const inUse = vehicles.filter((vehicle) => vehicle.status === 'IN_USE').length
  const maintenance = vehicles.filter((vehicle) => vehicle.status === 'MAINTENANCE').length
  return <Generic title="Fleet & vehicles" icon={Truck} subtitle="Maintain vehicle capacity and suitability data used by WAREX's shipment routing engine.">
    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mt-5"><div className="metric-card"><span className="metric-label">Available</span><strong>{available}</strong><span className="metric-note">Ready for assignment</span></div><div className="metric-card"><span className="metric-label">In use</span><strong>{inUse}</strong><span className="metric-note">Assigned to active runs</span></div><div className="metric-card"><span className="metric-label">Maintenance</span><strong>{maintenance}</strong><span className="metric-note">Unavailable for dispatch</span></div></div>
    <div className="section-heading"><div><h2>Registered vehicles</h2><p>Vehicle dimensions and weight limits are used to check package fit.</p></div><button className="btn-primary" onClick={() => { setFormOpen((value) => !value); setFormError('') }}><PackagePlus size={15} /> {formOpen ? 'Close form' : 'Add vehicle'}</button></div>
    {formOpen && <form onSubmit={submit} className="form-panel"><div className="form-panel-heading"><div><h3>Add a fleet vehicle</h3><p>All measurements must be positive numbers.</p></div></div><div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">{[
      ['registrationNo','Registration number','text'],['vehicleType','Vehicle type','text'],['capacity','Capacity (kg)','number'],['maxWeightKg','Maximum payload (kg)','number'],['maxLengthCm','Max length (cm)','number'],['maxWidthCm','Max width (cm)','number'],['maxHeightCm','Max height (cm)','number'],['operatingCostPerKm','Operating cost / km','number'],['energyUsePerKm','Energy use / km','number'],['averageSpeedKmph','Average speed (km/h)','number'],
    ].map(([name,label,type]) => <label className="field-label" key={name}>{label}<input required type={type} min={type === 'number' ? '0.01' : undefined} step={type === 'number' ? (name === 'capacity' ? '1' : 'any') : undefined} value={form[name]} onChange={(event) => setForm((current) => ({ ...current, [name]: event.target.value }))} placeholder={label} /></label>)}</div>{formError && <p className="form-error">{formError}</p>}<div className="flex gap-2 mt-4"><button className="btn-primary" disabled={saving}>{saving ? 'Saving…' : 'Save vehicle'}</button><button type="button" className="btn-secondary" onClick={() => setFormOpen(false)}>Cancel</button></div></form>}
    <div className="table-shell"><div className="overflow-x-auto"><table className="data-table"><thead><tr>{['Vehicle','Registration','Payload','Dimensions (L × W × H)','Cost / km','Status','Action'].map((header) => <th key={header}>{header}</th>)}</tr></thead><tbody>{vehicles.map((vehicle) => <tr key={vehicle.id}><td><strong>{vehicle.vehicleType}</strong><small>{vehicle.capacity?.toLocaleString()} kg capacity</small></td><td className="record-id">{vehicle.registrationNo}</td><td>{Number(vehicle.maxWeightKg).toLocaleString()} kg</td><td>{vehicle.maxLengthCm} × {vehicle.maxWidthCm} × {vehicle.maxHeightCm} cm</td><td>₹{Number(vehicle.operatingCostPerKm).toFixed(2)}</td><td><StatusPill label={vehicle.statusLabel || vehicle.status} variant={vehicle.status === 'AVAILABLE' ? 'green' : vehicle.status === 'MAINTENANCE' ? 'red' : 'amber'} /></td><td>{vehicle.status === 'IN_USE' ? <span className="subtle-note">Active run</span> : <select aria-label={`Update status for ${vehicle.registrationNo}`} className="compact-select" value={vehicle.status} onChange={(event) => updateVehicleStatus(vehicle.id, event.target.value)}><option value="AVAILABLE">Available</option><option value="MAINTENANCE">Maintenance</option></select>}</td></tr>)}{vehicles.length === 0 && <tr><td colSpan={7}><div className="empty-inline">No vehicles found. Add a vehicle with complete specifications to enable automatic selection.</div></td></tr>}</tbody></table></div></div>
    <div className="section-heading"><div><h2>Delivery runs</h2><p>Runs currently recorded in the system.</p></div><span className="count-chip">{deliveryRuns.length} runs</span></div><div className="table-shell"><div className="overflow-x-auto"><table className="data-table"><thead><tr>{['Run','Route','Vehicle','Delivery partner','Status'].map((header) => <th key={header}>{header}</th>)}</tr></thead><tbody>{deliveryRuns.map((run) => <tr key={run.id}><td className="record-id">{run.id}</td><td>{run.route}</td><td>{run.vehicleRegistration}</td><td>{run.driverName}</td><td><StatusPill label={run.status} variant={run.status === 'COMPLETED' ? 'green' : run.status === 'IN_PROGRESS' ? 'amber' : 'neutral'} /></td></tr>)}{deliveryRuns.length === 0 && <tr><td colSpan={5}><div className="empty-inline">No delivery runs have been created yet.</div></td></tr>}</tbody></table></div></div>
  </Generic>
}

export function Returns() {
  const { returns = [], updateReturnStatus } = useWarex()
  const [busyId, setBusyId] = useState(null)
  async function update(item, status) {
    setBusyId(item.id)
    await updateReturnStatus(item.id, status)
    setBusyId(null)
  }
  return <Generic title="Returns & inspections" icon={Undo2} subtitle="Review customer return requests and keep each decision in the WAREX record.">
    <div className="section-heading"><div><h2>Return requests</h2><p>Approve, reject, receive and close requests based on inspection.</p></div><span className="count-chip">{returns.length} requests</span></div>
    <div className="table-shell"><div className="overflow-x-auto"><table className="data-table"><thead><tr>{['Return','Order','Reason','Customer','Status','Next action'].map((header) => <th key={header}>{header}</th>)}</tr></thead><tbody>{returns.map((item) => <tr key={item.id}><td className="record-id">{item.id}</td><td>{item.order || '—'}</td><td>{item.reason}</td><td>{item.customerEmail || '—'}</td><td><StatusPill label={item.status} variant={item.status === 'Closed' ? 'green' : item.status === 'Rejected' ? 'red' : 'amber'} /></td><td>{item.status === 'Open' ? <div className="flex flex-wrap gap-2"><button disabled={busyId === item.id} onClick={() => update(item, 'Approved')} className="btn-small">Approve</button><button disabled={busyId === item.id} onClick={() => update(item, 'Rejected')} className="btn-small btn-small-danger">Reject</button></div> : item.status === 'Approved' ? <button disabled={busyId === item.id} onClick={() => update(item, 'Received')} className="btn-small">Mark received</button> : item.status === 'Received' ? <button disabled={busyId === item.id} onClick={() => update(item, 'Closed')} className="btn-small">Close return</button> : <span className="subtle-note">No action required</span>}</td></tr>)}{returns.length === 0 && <tr><td colSpan={6}><div className="empty-inline">No return requests have been submitted yet.</div></td></tr>}</tbody></table></div></div>
  </Generic>
}

export function Reports() {
  const { users, orders, shipments, inventory, complaints } = useWarex()
  const cards = [{ label: 'Users', value: users.length }, { label: 'Orders', value: orders.length }, { label: 'Shipments', value: shipments.length }, { label: 'SKUs', value: inventory.length }, { label: 'Complaints', value: complaints.length }]
  return <Generic title="Reports" icon={FileBarChart} subtitle="A live summary generated from the current WAREX database data."><div className="grid grid-cols-2 lg:grid-cols-5 gap-3">{cards.map((c) => <div key={c.label} className="rounded-lg p-4" style={{ background: 'var(--paper-panel)', border: '1px solid var(--paper-line)' }}><div className="text-xs" style={{ color: 'var(--muted)' }}>{c.label}</div><div className="mt-2 text-2xl font-semibold font-mono-data" style={{ color: 'var(--text)' }}>{c.value}</div></div>)}</div><div className="mt-5 rounded-lg p-5" style={{ background: 'var(--paper-panel)', border: '1px solid var(--paper-line)' }}><h2 className="text-sm font-semibold" style={{ color: 'var(--text)' }}>Workflow health</h2><p className="mt-2 text-sm leading-relaxed" style={{ color: 'var(--muted)' }}>Orders, stock, shipments, restocks, complaints and service visits are loaded from the WAREX API and persisted in PostgreSQL.</p></div></Generic>
}

function Generic({ title, subtitle, icon: Icon, children }) { return <div><div className="flex items-center gap-2"><Icon size={18} style={{ color: 'var(--accent-dim)' }} /><h1 className="text-xl font-semibold" style={{ color: 'var(--text)' }}>{title}</h1></div><p className="mt-1 text-sm" style={{ color: 'var(--muted)' }}>{subtitle}</p>{children}</div> }
function SimpleTable({ headers, rows }) { return <div className="mt-5 rounded-lg overflow-hidden" style={{ background: 'var(--paper-panel)', border: '1px solid var(--paper-line)' }}><div className="overflow-x-auto"><table className="w-full text-sm"><thead><tr style={{ borderBottom: '1px solid var(--paper-line)' }}>{headers.map((h) => <th key={h} className="text-left px-4 py-2.5 text-xs font-medium" style={{ color: 'var(--muted)' }}>{h}</th>)}</tr></thead><tbody>{rows.map((row, idx) => <tr key={idx} style={{ borderBottom: '1px solid var(--paper-line)' }}>{row.map((cell, i) => <td key={i} className="px-4 py-3" style={{ color: 'var(--text)' }}>{cell}</td>)}</tr>)}</tbody></table></div></div> }
