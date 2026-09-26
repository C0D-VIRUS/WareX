import { useState } from 'react'
import { Inbox, X, PackageCheck } from 'lucide-react'
import StatusPill from '../../components/common/StatusPill'
import { useWarex } from '../../context/WarexContext'

const INITIAL_SHIPMENTS = [
  { id: 'RS-2026-0142', manufacturer: 'Hero Electronics Pvt Ltd', sku: 'TV-55-4K-SAM', cartons: 20, expected: '08 Sep, 10:00 AM', status: 'pending' },
  { id: 'RS-2026-0143', manufacturer: 'Kalyani Appliances Co.', sku: 'AC-1.5T-SPLIT-LG', cartons: 12, expected: '08 Sep, 11:30 AM', status: 'pending' },
  { id: 'RS-2026-0139', manufacturer: 'Hero Electronics Pvt Ltd', sku: 'CHG-65W-USB-C', cartons: 50, expected: '07 Sep, 09:00 AM', status: 'partial' },
  { id: 'RS-2026-0135', manufacturer: 'Om Sai Distributors', sku: 'TV-43-4K-SAM', cartons: 15, expected: '06 Sep, 02:00 PM', status: 'received' },
  { id: 'RS-2026-0128', manufacturer: 'Kalyani Appliances Co.', sku: 'MW-20L-SOLO-IFB', cartons: 18, expected: '05 Sep, 10:00 AM', status: 'received' },
]

const STATUS_META = {
  pending: { label: 'Pending', variant: 'amber' },
  partial: { label: 'Partially received', variant: 'neutral' },
  received: { label: 'Received', variant: 'green' },
}

const BINS = ['A-12-03', 'A-14-01', 'B-06-02', 'B-09-04', 'C-02-01', 'C-11-05']

function ReceiveModal({ shipment, onClose, onConfirm }) {
  const [received, setReceived] = useState(shipment.cartons)
  const [bin, setBin] = useState(BINS[0])
  const [note, setNote] = useState('')

  return (
    <div className="fixed inset-0 z-40 flex items-center justify-center px-4">
      <div className="absolute inset-0 bg-black/40" onClick={onClose} />
      <div
        className="relative w-full max-w-md rounded-lg p-5"
        style={{ background: 'var(--paper-panel)', border: '1px solid var(--paper-line)' }}
      >
        <div className="flex items-start justify-between">
          <div>
            <h2 className="text-base font-semibold" style={{ color: 'var(--text)' }}>Log receipt</h2>
            <p className="text-xs mt-0.5" style={{ color: 'var(--muted)' }}>{shipment.id} · {shipment.manufacturer}</p>
          </div>
          <button onClick={onClose} aria-label="Close" style={{ color: 'var(--muted)' }}><X size={18} /></button>
        </div>

        <div className="mt-4 space-y-3">
          <div>
            <label className="block text-xs font-medium mb-1" style={{ color: 'var(--text)' }}>SKU</label>
            <div className="text-sm font-mono-data" style={{ color: 'var(--text)' }}>{shipment.sku}</div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium mb-1" style={{ color: 'var(--text)' }}>Expected cartons</label>
              <div className="text-sm font-mono-data py-2" style={{ color: 'var(--muted)' }}>{shipment.cartons}</div>
            </div>
            <div>
              <label htmlFor="received" className="block text-xs font-medium mb-1" style={{ color: 'var(--text)' }}>
                Cartons received
              </label>
              <input
                id="received"
                type="number"
                min={0}
                value={received}
                onChange={(e) => setReceived(e.target.value)}
                className="w-full px-2.5 py-2 text-sm rounded-md outline-none font-mono-data"
                style={{ background: 'var(--paper)', border: '1px solid var(--paper-line)', color: 'var(--text)' }}
              />
            </div>
          </div>

          <div>
            <label htmlFor="bin" className="block text-xs font-medium mb-1" style={{ color: 'var(--text)' }}>
              Store in bin
            </label>
            <select
              id="bin"
              value={bin}
              onChange={(e) => setBin(e.target.value)}
              className="w-full px-2.5 py-2 text-sm rounded-md outline-none font-mono-data"
              style={{ background: 'var(--paper)', border: '1px solid var(--paper-line)', color: 'var(--text)' }}
            >
              {BINS.map((b) => <option key={b} value={b}>{b}</option>)}
            </select>
          </div>

          <div>
            <label htmlFor="note" className="block text-xs font-medium mb-1" style={{ color: 'var(--text)' }}>
              Discrepancy note <span style={{ color: 'var(--muted)' }}>(optional)</span>
            </label>
            <textarea
              id="note"
              rows={2}
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder="e.g. 2 cartons damaged in transit"
              className="w-full px-2.5 py-2 text-sm rounded-md outline-none resize-none"
              style={{ background: 'var(--paper)', border: '1px solid var(--paper-line)', color: 'var(--text)' }}
            />
          </div>
        </div>

        <div className="mt-5 flex gap-2">
          <button
            onClick={onClose}
            className="flex-1 py-2 text-sm rounded-md"
            style={{ border: '1px solid var(--paper-line)', color: 'var(--text)' }}
          >
            Cancel
          </button>
          <button
            onClick={() => onConfirm({ received: Number(received), bin, note })}
            className="flex-1 py-2 text-sm rounded-md font-medium"
            style={{ background: 'var(--accent)', color: 'var(--accent-ink)' }}
          >
            Confirm receipt
          </button>
        </div>
      </div>
    </div>
  )
}

export default function Receiving() {
  const { restocks, receiveRestock } = useWarex()
  const shipments = restocks.map((r) => ({ id: r.id, manufacturer: r.manufacturer, sku: r.sku, cartons: r.qty, expected: r.createdAt, status: r.status === 'Received' ? 'received' : r.status === 'Submitted' ? 'pending' : 'partial' }))
  const [activeShipment, setActiveShipment] = useState(null)

  const pendingCount = shipments.filter((s) => s.status !== 'received').length

  function handleConfirm({ received, bin }) {
    if (received > 0) receiveRestock(activeShipment.id)
    setActiveShipment(null)
  }

  return (
    <div>
      <div className="flex items-center gap-2">
        <Inbox size={18} style={{ color: 'var(--accent-dim)' }} />
        <h1 className="text-xl font-semibold" style={{ color: 'var(--text)' }}>Receiving</h1>
      </div>
      <p className="mt-1 text-sm" style={{ color: 'var(--muted)' }}>
        {pendingCount} shipment{pendingCount !== 1 ? 's' : ''} awaiting receipt against rack/bin.
      </p>

      <div
        className="mt-5 rounded-lg overflow-hidden"
        style={{ background: 'var(--paper-panel)', border: '1px solid var(--paper-line)' }}
      >
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr style={{ borderBottom: '1px solid var(--paper-line)' }}>
                {['Shipment', 'Manufacturer', 'SKU', 'Cartons', 'Expected', 'Status', ''].map((h) => (
                  <th key={h} className="text-left px-4 py-2.5 text-xs font-medium" style={{ color: 'var(--muted)' }}>
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {shipments.map((s) => {
                const meta = STATUS_META[s.status]
                return (
                  <tr key={s.id} style={{ borderBottom: '1px solid var(--paper-line)' }}>
                    <td className="px-4 py-3 font-mono-data" style={{ color: 'var(--text)' }}>{s.id}</td>
                    <td className="px-4 py-3" style={{ color: 'var(--text)' }}>{s.manufacturer}</td>
                    <td className="px-4 py-3 font-mono-data text-xs" style={{ color: 'var(--muted)' }}>{s.sku}</td>
                    <td className="px-4 py-3 font-mono-data" style={{ color: 'var(--text)' }}>{s.cartons}</td>
                    <td className="px-4 py-3" style={{ color: 'var(--muted)' }}>{s.expected}</td>
                    <td className="px-4 py-3"><StatusPill label={meta.label} variant={meta.variant} /></td>
                    <td className="px-4 py-3 text-right">
                      {s.status !== 'received' && (
                        <button
                          onClick={() => setActiveShipment(s)}
                          className="inline-flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-medium rounded-md"
                          style={{ background: 'var(--ink)', color: '#fff' }}
                        >
                          <PackageCheck size={13} />
                          Receive
                        </button>
                      )}
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      </div>

      {activeShipment && (
        <ReceiveModal
          shipment={activeShipment}
          onClose={() => setActiveShipment(null)}
          onConfirm={handleConfirm}
        />
      )}
    </div>
  )
}
