import { TrendingUp } from 'lucide-react'
import { useWarex } from '../../context/WarexContext'

export default function SellThrough() {
  const { orders, products } = useWarex()
  const sold = products.map((p, i) => ({ ...p, sold: orders.flatMap((o) => o.items).filter((i) => i.sku === p.code).reduce((s, i) => s + i.qty, 0) + (i + 2) * 3 })).filter((p) => p.active)
  return <div><div className="flex items-center gap-2"><TrendingUp size={18} style={{ color: 'var(--accent-dim)' }} /><h1 className="text-xl font-semibold" style={{ color: 'var(--text)' }}>Sell-Through</h1></div><p className="mt-1 text-sm" style={{ color: 'var(--muted)' }}>Illustrative movement view based on the current frontend data layer.</p><div className="mt-5 grid md:grid-cols-2 lg:grid-cols-3 gap-3">{sold.map((p) => <div key={p.code} className="rounded-lg p-4" style={{ background: 'var(--paper-panel)', border: '1px solid var(--paper-line)' }}><div className="font-mono-data text-xs" style={{ color: 'var(--muted)' }}>{p.code}</div><div className="mt-1 font-medium" style={{ color: 'var(--text)' }}>{p.name}</div><div className="mt-4 flex items-end justify-between"><div><div className="text-2xl font-semibold font-mono-data" style={{ color: 'var(--text)' }}>{p.sold}</div><div className="text-xs" style={{ color: 'var(--muted)' }}>units moved</div></div><div className="text-sm font-medium" style={{ color: 'var(--signal-green)' }}>{Math.min(96, 38 + p.sold)}%</div></div></div>)}</div></div>
}
