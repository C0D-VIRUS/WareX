import { ClipboardCheck } from 'lucide-react'
import { useWarex } from '../../context/WarexContext'

export default function ServiceReports({ session }) {
  const { serviceVisits } = useWarex()
  const reports = serviceVisits.filter((v) => v.technicianEmail === session.email && v.report)
  return <div><div className="flex items-center gap-2"><ClipboardCheck size={18} style={{ color: 'var(--accent-dim)' }} /><h1 className="text-xl font-semibold" style={{ color: 'var(--text)' }}>Service Reports</h1></div><p className="mt-1 text-sm" style={{ color: 'var(--muted)' }}>Completed service reports submitted from technician visits.</p><div className="mt-5 space-y-3">{reports.map((r) => <div key={r.id} className="rounded-lg p-4" style={{ background: 'var(--paper-panel)', border: '1px solid var(--paper-line)' }}><div className="font-mono-data text-xs" style={{ color: 'var(--muted)' }}>{r.id} · {r.orderId}</div><div className="mt-1 font-medium" style={{ color: 'var(--text)' }}>{r.customerName}</div><p className="mt-3 text-sm leading-relaxed" style={{ color: 'var(--muted)' }}>{r.report}</p></div>)}{reports.length === 0 && <div className="rounded-lg p-10 text-center" style={{ background: 'var(--paper-panel)', border: '1px dashed var(--paper-line)' }}><p className="text-sm" style={{ color: 'var(--muted)' }}>No reports submitted yet.</p></div>}</div></div>
}
