import { useState } from 'react'
import { Store, Check, Power, Eye, X } from 'lucide-react'
import StatusPill from '../../components/common/StatusPill'

const INITIAL_CUSTOMERS = [
  { id: 'BC-0031', shop: 'Sharma Electronics', owner: 'Ramesh Sharma', email: 'ramesh@sharmaelec.in', city: 'Pune', status: 'verified', active: false },
  { id: 'BC-0032', shop: 'Digital World Retail', owner: 'Anita Deshmukh', email: 'anita@digitalworld.in', city: 'Nagpur', status: 'pending', active: true },
  { id: 'BC-0021', shop: 'City Appliances', owner: 'Sunil Kale', email: 'sunil@cityappliances.in', city: 'Pune', status: 'verified', active: false },
  { id: 'BC-0019', shop: 'Mehta Home Solutions', owner: 'Priya Mehta', email: 'priya@mehtahome.in', city: 'Mumbai', status: 'verified', active: false },
  { id: 'BC-0014', shop: 'Patil Electronics Hub', owner: 'Vikas Patil', email: 'vikas@patilhub.in', city: 'Nashik', status: 'verified', active: true },
]

const STATUS_META = {
  pending: { label: 'Pending review', variant: 'amber' },
  verified: { label: 'Verified', variant: 'green' },
}

function DetailModal({ customer, onClose }) {
  return (
    <div className="fixed inset-0 z-40 flex items-center justify-center px-4">
      <div className="absolute inset-0 bg-black/40" onClick={onClose} />
      <div
        className="relative w-full max-w-sm rounded-lg p-5"
        style={{ background: 'var(--paper-panel)', border: '1px solid var(--paper-line)' }}
      >
        <div className="flex items-start justify-between">
          <h2 className="text-base font-semibold" style={{ color: 'var(--text)' }}>{customer.shop}</h2>
          <button onClick={onClose} aria-label="Close" style={{ color: 'var(--muted)' }}><X size={18} /></button>
        </div>
        <dl className="mt-4 space-y-2.5 text-sm">
          {[
            ['Customer ID', customer.id],
            ['Owner', customer.owner],
            ['Email', customer.email],
            ['City', customer.city],
            ['Status', STATUS_META[customer.status].label],
          ].map(([k, v]) => (
            <div key={k} className="flex justify-between gap-4">
              <dt style={{ color: 'var(--muted)' }}>{k}</dt>
              <dd className="text-right" style={{ color: 'var(--text)' }}>{v}</dd>
            </div>
          ))}
        </dl>
      </div>
    </div>
  )
}

export default function BusinessCustomers() {
  const [customers, setCustomers] = useState(INITIAL_CUSTOMERS)
  const [viewing, setViewing] = useState(null)

  const pendingCount = customers.filter((c) => c.status === 'pending').length

  function setStatus(id, status) {
    setCustomers((prev) => prev.map((c) => (c.id === id ? { ...c, status } : c)))
  }

  function toggleActive(id) {
    setCustomers((prev) => prev.map((c) => (c.id === id ? { ...c, active: !c.active } : c)))
  }

  return (
    <div>
      <div className="flex items-center gap-2">
        <Store size={18} style={{ color: 'var(--accent-dim)' }} />
        <h1 className="text-xl font-semibold" style={{ color: 'var(--text)' }}>Business Customers</h1>
      </div>
      <p className="mt-1 text-sm" style={{ color: 'var(--muted)' }}>
        {pendingCount} registration{pendingCount !== 1 ? 's' : ''} awaiting verification. Only verified accounts can place orders.
      </p>

      <div
        className="mt-5 rounded-lg overflow-hidden"
        style={{ background: 'var(--paper-panel)', border: '1px solid var(--paper-line)' }}
      >
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr style={{ borderBottom: '1px solid var(--paper-line)' }}>
                {['ID', 'Shop', 'Owner', 'City', 'Status', 'Active', ''].map((h) => (
                  <th key={h} className="text-left px-4 py-2.5 text-xs font-medium" style={{ color: 'var(--muted)' }}>
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {customers.map((c) => {
                const meta = STATUS_META[c.status]
                return (
                  <tr key={c.id} style={{ borderBottom: '1px solid var(--paper-line)' }}>
                    <td className="px-4 py-3 font-mono-data text-xs" style={{ color: 'var(--text)' }}>{c.id}</td>
                    <td className="px-4 py-3" style={{ color: 'var(--text)' }}>{c.shop}</td>
                    <td className="px-4 py-3" style={{ color: 'var(--muted)' }}>{c.owner}</td>
                    <td className="px-4 py-3" style={{ color: 'var(--muted)' }}>{c.city}</td>
                    <td className="px-4 py-3"><StatusPill label={meta.label} variant={meta.variant} /></td>
                    <td className="px-4 py-3">
                      {c.status === 'verified'
                        ? <StatusPill label={c.active ? 'Active' : 'Inactive'} variant={c.active ? 'green' : 'neutral'} />
                        : <span className="text-xs" style={{ color: 'var(--muted)' }}>—</span>}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center justify-end gap-1.5">
                        <button
                          onClick={() => setViewing(c)}
                          aria-label={`View ${c.shop}`}
                          className="p-1.5 rounded-md"
                          style={{ border: '1px solid var(--paper-line)', color: 'var(--text)' }}
                        >
                          <Eye size={13} />
                        </button>
                        {c.status === 'pending' && (
                          <button
                            onClick={() => setStatus(c.id, 'verified')}
                            aria-label={`Approve ${c.shop}`}
                            className="p-1.5 rounded-md"
                            style={{ border: '1px solid var(--paper-line)', color: 'var(--signal-green)' }}
                          >
                            <Check size={13} />
                          </button>
                        )}
                        {c.status === 'verified' && (
                          <button
                            onClick={() => toggleActive(c.id)}
                            aria-label={c.active ? `Deactivate ${c.shop}` : `Activate ${c.shop}`}
                            className="p-1.5 rounded-md"
                            style={{
                              border: '1px solid var(--paper-line)',
                              color: c.active ? 'var(--signal-red)' : 'var(--signal-green)',
                            }}
                          >
                            <Power size={13} />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      </div>

      {viewing && <DetailModal customer={viewing} onClose={() => setViewing(null)} />}
    </div>
  )
}
