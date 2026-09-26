import { useState } from 'react'
import { FileText, CheckCircle2 } from 'lucide-react'
import StatusPill from '../../components/common/StatusPill'

const INITIAL = [
  { id: 'PO-2026-0081', supplier: 'WAREX Pune Central', lines: 4, value: 482000, status: 'Open' },
  { id: 'PO-2026-0078', supplier: 'WAREX Mumbai Hub', lines: 2, value: 199000, status: 'Accepted' },
  { id: 'PO-2026-0075', supplier: 'WAREX Pune Central', lines: 6, value: 720500, status: 'Fulfilled' },
]

export default function PurchaseOrders() {
  const [orders, setOrders] = useState(INITIAL)
  function accept(id) { setOrders((prev) => prev.map((o) => o.id === id ? { ...o, status: 'Accepted' } : o)) }
  return <div><div className="flex items-center gap-2"><FileText size={18} style={{ color: 'var(--accent-dim)' }} /><h1 className="text-xl font-semibold" style={{ color: 'var(--text)' }}>Purchase Orders</h1></div><p className="mt-1 text-sm" style={{ color: 'var(--muted)' }}>Accept incoming WAREX purchase orders and keep supplier commitments visible.</p><div className="mt-5 rounded-lg overflow-hidden" style={{ background: 'var(--paper-panel)', border: '1px solid var(--paper-line)' }}><table className="w-full text-sm"><thead><tr style={{ borderBottom: '1px solid var(--paper-line)' }}>{['PO','Destination','Lines','Value','Status','Action'].map((h) => <th key={h} className="text-left px-4 py-2.5 text-xs font-medium" style={{ color: 'var(--muted)' }}>{h}</th>)}</tr></thead><tbody>{orders.map((o) => <tr key={o.id} style={{ borderBottom: '1px solid var(--paper-line)' }}><td className="px-4 py-3 font-mono-data text-xs" style={{ color: 'var(--text)' }}>{o.id}</td><td className="px-4 py-3" style={{ color: 'var(--text)' }}>{o.supplier}</td><td className="px-4 py-3 font-mono-data" style={{ color: 'var(--text)' }}>{o.lines}</td><td className="px-4 py-3 font-mono-data" style={{ color: 'var(--text)' }}>₹{o.value.toLocaleString('en-IN')}</td><td className="px-4 py-3"><StatusPill label={o.status} variant={o.status === 'Fulfilled' ? 'green' : o.status === 'Accepted' ? 'amber' : 'neutral'} /></td><td className="px-4 py-3">{o.status === 'Open' && <button onClick={() => accept(o.id)} className="inline-flex items-center gap-1.5 px-2.5 py-1.5 text-xs rounded-md" style={{ background: 'var(--ink)', color: '#fff' }}><CheckCircle2 size={12} /> Accept</button>}</td></tr>)}</tbody></table></div></div>
}
