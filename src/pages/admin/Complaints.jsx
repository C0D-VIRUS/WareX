import { useMemo, useState } from 'react'
import { MessageSquareWarning, UserRoundCheck } from 'lucide-react'
import { useWarex } from '../../context/WarexContext'
import StatusPill from '../../components/common/StatusPill'

export default function Complaints() {
  const { complaints, users, resolveComplaint, assignTechnician } = useWarex()
  const technicians = users.filter((u) => u.roleId === 'technician' && u.active)
  const [filter, setFilter] = useState('all')
  const rows = useMemo(() => complaints.filter((c) => filter === 'all' || c.status === filter), [complaints, filter])
  return <div>
    <div className="flex items-center gap-2"><MessageSquareWarning size={18} style={{ color: 'var(--accent-dim)' }} /><h1 className="text-xl font-semibold" style={{ color: 'var(--text)' }}>Complaints</h1></div>
    <p className="mt-1 text-sm" style={{ color: 'var(--muted)' }}>Review complaints, assign service visits and close resolved cases.</p>
    <div className="mt-4 flex gap-2">{['all','Open','Service Assigned','Resolved'].map((f) => <button key={f} onClick={() => setFilter(f)} className="px-3 py-1.5 text-xs rounded-full" style={{ background: filter === f ? 'var(--ink)' : 'var(--paper-panel)', color: filter === f ? '#fff' : 'var(--text)', border: '1px solid var(--paper-line)' }}>{f === 'all' ? 'All' : f}</button>)}</div>
    <div className="mt-4 rounded-lg overflow-hidden" style={{ background: 'var(--paper-panel)', border: '1px solid var(--paper-line)' }}><div className="overflow-x-auto"><table className="w-full text-sm"><thead><tr style={{ borderBottom: '1px solid var(--paper-line)' }}>{['Complaint','Order','Issue','Status','Technician','Actions'].map((h) => <th key={h} className="text-left px-4 py-2.5 text-xs font-medium" style={{ color: 'var(--muted)' }}>{h}</th>)}</tr></thead><tbody>{rows.map((c) => <tr key={c.id} style={{ borderBottom: '1px solid var(--paper-line)' }}><td className="px-4 py-3 font-mono-data text-xs" style={{ color: 'var(--text)' }}>{c.id}</td><td className="px-4 py-3 text-xs" style={{ color: 'var(--muted)' }}>{c.orderId}</td><td className="px-4 py-3"><div style={{ color: 'var(--text)' }}>{c.subject}</div><div className="text-xs mt-0.5" style={{ color: 'var(--muted)' }}>{c.description}</div></td><td className="px-4 py-3"><StatusPill label={c.status} variant={c.status === 'Resolved' ? 'green' : c.status === 'Service Assigned' ? 'amber' : 'red'} /></td><td className="px-4 py-3 text-xs" style={{ color: 'var(--muted)' }}>{c.assignedTo || '—'}</td><td className="px-4 py-3"><div className="flex flex-wrap gap-2">{c.status === 'Open' && <select defaultValue="" onChange={(e) => e.target.value && assignTechnician(c.id, e.target.value)} className="px-2 py-1.5 text-xs rounded-md outline-none" style={{ background: 'var(--paper)', border: '1px solid var(--paper-line)', color: 'var(--text)' }}><option value="">Assign technician</option>{technicians.map((t) => <option key={t.id} value={t.email}>{t.name}</option>)}</select>}{c.status !== 'Resolved' && <button onClick={() => resolveComplaint(c.id)} className="inline-flex items-center gap-1.5 px-2.5 py-1.5 text-xs rounded-md" style={{ background: 'var(--ink)', color: '#fff' }}><UserRoundCheck size={12} /> Resolve</button>}</div></td></tr>)}</tbody></table></div></div>
  </div>
}
