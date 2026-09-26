import { useState, useMemo } from 'react'
import { Boxes, Search, SlidersHorizontal, X } from 'lucide-react'
import StatusPill from '../../components/common/StatusPill'
import { useWarex } from '../../context/WarexContext'

const INITIAL_INVENTORY = [
  { sku: 'TV-55-4K-SAM', name: 'Samsung 55" 4K Smart TV', bin: 'A-12-03', available: 34, reserved: 6, reorder: 20 },
  { sku: 'TV-43-4K-SAM', name: 'Samsung 43" 4K Smart TV', bin: 'A-14-01', available: 12, reserved: 4, reorder: 15 },
  { sku: 'AC-1.5T-SPLIT-LG', name: 'LG 1.5 Ton Split AC', bin: 'B-06-02', available: 8, reserved: 2, reorder: 10 },
  { sku: 'AC-1T-SPLIT-VOLTAS', name: 'Voltas 1 Ton Split AC', bin: 'B-07-01', available: 0, reserved: 0, reorder: 8 },
  { sku: 'MW-20L-SOLO-IFB', name: 'IFB 20L Solo Microwave', bin: 'C-02-01', available: 42, reserved: 5, reorder: 15 },
  { sku: 'CHG-65W-USB-C', name: '65W USB-C Fast Charger', bin: 'C-11-05', available: 210, reserved: 30, reorder: 100 },
  { sku: 'CBL-HDMI-2M', name: 'HDMI Cable 2m', bin: 'C-11-06', available: 95, reserved: 10, reorder: 100 },
  { sku: 'RF-190L-DIR-WHIRL', name: 'Whirlpool 190L Direct-Cool Fridge', bin: 'B-09-04', available: 19, reserved: 3, reorder: 12 },
]

const REASONS = ['Damage', 'Loss', 'Correction', 'Other']

function statusFor(item) {
  if (item.available === 0) return { label: 'Out of stock', variant: 'red' }
  if (item.available <= item.reorder) return { label: 'Low stock', variant: 'amber' }
  return { label: 'In stock', variant: 'green' }
}

function AdjustModal({ item, onClose, onConfirm }) {
  const [delta, setDelta] = useState(0)
  const [reason, setReason] = useState(REASONS[0])
  const [note, setNote] = useState('')
  const [error, setError] = useState('')

  const resultingQty = item.available + Number(delta || 0)

  function handleSubmit(e) {
    e.preventDefault()
    if (Number(delta) === 0) {
      setError('Enter a non-zero adjustment (positive to add, negative to remove).')
      return
    }
    if (resultingQty < 0) {
      setError('This would take available stock below zero.')
      return
    }
    if (!note.trim() && reason === 'Other') {
      setError('Add a short note when the reason is "Other".')
      return
    }
    onConfirm({ delta: Number(delta), reason, note })
  }

  return (
    <div className="fixed inset-0 z-40 flex items-center justify-center px-4">
      <div className="absolute inset-0 bg-black/40" onClick={onClose} />
      <form
        onSubmit={handleSubmit}
        className="relative w-full max-w-md rounded-lg p-5"
        style={{ background: 'var(--paper-panel)', border: '1px solid var(--paper-line)' }}
      >
        <div className="flex items-start justify-between">
          <div>
            <h2 className="text-base font-semibold" style={{ color: 'var(--text)' }}>Adjust stock</h2>
            <p className="text-xs mt-0.5 font-mono-data" style={{ color: 'var(--muted)' }}>{item.sku} · Bin {item.bin}</p>
          </div>
          <button type="button" onClick={onClose} aria-label="Close" style={{ color: 'var(--muted)' }}>
            <X size={18} />
          </button>
        </div>

        <div className="mt-4 space-y-3">
          <div className="flex items-center justify-between px-3 py-2 rounded-md" style={{ background: 'var(--paper)' }}>
            <span className="text-xs" style={{ color: 'var(--muted)' }}>Current available</span>
            <span className="text-sm font-mono-data font-medium" style={{ color: 'var(--text)' }}>{item.available}</span>
          </div>

          <div>
            <label htmlFor="delta" className="block text-xs font-medium mb-1" style={{ color: 'var(--text)' }}>
              Adjustment (+ to add, − to remove)
            </label>
            <input
              id="delta"
              type="number"
              value={delta}
              onChange={(e) => setDelta(e.target.value)}
              placeholder="e.g. -3 or 10"
              className="w-full px-2.5 py-2 text-sm rounded-md outline-none font-mono-data"
              style={{ background: 'var(--paper-panel)', border: '1px solid var(--paper-line)', color: 'var(--text)' }}
            />
          </div>

          <div>
            <label htmlFor="reason" className="block text-xs font-medium mb-1" style={{ color: 'var(--text)' }}>Reason</label>
            <select
              id="reason"
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              className="w-full px-2.5 py-2 text-sm rounded-md outline-none"
              style={{ background: 'var(--paper-panel)', border: '1px solid var(--paper-line)', color: 'var(--text)' }}
            >
              {REASONS.map((r) => <option key={r} value={r}>{r}</option>)}
            </select>
          </div>

          <div>
            <label htmlFor="note" className="block text-xs font-medium mb-1" style={{ color: 'var(--text)' }}>
              Note {reason !== 'Other' && <span style={{ color: 'var(--muted)' }}>(optional)</span>}
            </label>
            <textarea
              id="note"
              rows={2}
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder="e.g. 3 units found damaged during cycle count"
              className="w-full px-2.5 py-2 text-sm rounded-md outline-none resize-none"
              style={{ background: 'var(--paper-panel)', border: '1px solid var(--paper-line)', color: 'var(--text)' }}
            />
          </div>

          <div className="flex items-center justify-between px-3 py-2 rounded-md" style={{ background: 'var(--paper)' }}>
            <span className="text-xs" style={{ color: 'var(--muted)' }}>Resulting available</span>
            <span
              className="text-sm font-mono-data font-medium"
              style={{ color: resultingQty < 0 ? 'var(--signal-red)' : 'var(--text)' }}
            >
              {resultingQty}
            </span>
          </div>

          {error && <p className="text-xs" style={{ color: 'var(--signal-red)' }}>{error}</p>}
        </div>

        <div className="mt-5 flex gap-2">
          <button
            type="button"
            onClick={onClose}
            className="flex-1 py-2 text-sm rounded-md"
            style={{ border: '1px solid var(--paper-line)', color: 'var(--text)' }}
          >
            Cancel
          </button>
          <button
            type="submit"
            className="flex-1 py-2 text-sm rounded-md font-medium"
            style={{ background: 'var(--accent)', color: 'var(--accent-ink)' }}
          >
            Confirm adjustment
          </button>
        </div>
      </form>
    </div>
  )
}

export default function Inventory() {
  const { inventory, adjustInventory } = useWarex()
  const [query, setQuery] = useState('')
  const [adjusting, setAdjusting] = useState(null)
  const [history, setHistory] = useState([])

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase()
    if (!q) return inventory
    return inventory.filter(
      (i) => i.sku.toLowerCase().includes(q) || i.name.toLowerCase().includes(q)
    )
  }, [inventory, query])

  const lowStockCount = inventory.filter((i) => i.available <= i.reorder).length

  function handleAdjustConfirm({ delta, reason, note }) {
    adjustInventory(adjusting.sku, delta)
    setHistory((prev) => [
      { sku: adjusting.sku, delta, reason, note, at: new Date().toLocaleString() },
      ...prev,
    ].slice(0, 5))
    setAdjusting(null)
  }

  return (
    <div>
      <div className="flex items-center gap-2">
        <Boxes size={18} style={{ color: 'var(--accent-dim)' }} />
        <h1 className="text-xl font-semibold" style={{ color: 'var(--text)' }}>Inventory</h1>
      </div>
      <p className="mt-1 text-sm" style={{ color: 'var(--muted)' }}>
        {lowStockCount} SKU{lowStockCount !== 1 ? 's' : ''} at or below reorder threshold.
      </p>

      <div className="mt-4 relative max-w-sm">
        <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2" style={{ color: 'var(--muted)' }} />
        <input
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search by SKU or product name…"
          className="w-full pl-9 pr-3 py-2 text-sm rounded-md outline-none"
          style={{ background: 'var(--paper-panel)', border: '1px solid var(--paper-line)', color: 'var(--text)' }}
        />
      </div>

      <div
        className="mt-4 rounded-lg overflow-hidden"
        style={{ background: 'var(--paper-panel)', border: '1px solid var(--paper-line)' }}
      >
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr style={{ borderBottom: '1px solid var(--paper-line)' }}>
                {['SKU', 'Product', 'Bin', 'Available', 'Reserved', 'Reorder at', 'Status', ''].map((h) => (
                  <th key={h} className="text-left px-4 py-2.5 text-xs font-medium" style={{ color: 'var(--muted)' }}>
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filtered.map((item) => {
                const status = statusFor(item)
                return (
                  <tr key={item.sku} style={{ borderBottom: '1px solid var(--paper-line)' }}>
                    <td className="px-4 py-3 font-mono-data text-xs" style={{ color: 'var(--text)' }}>{item.sku}</td>
                    <td className="px-4 py-3" style={{ color: 'var(--text)' }}>{item.name}</td>
                    <td className="px-4 py-3 font-mono-data text-xs" style={{ color: 'var(--muted)' }}>{item.bin}</td>
                    <td className="px-4 py-3 font-mono-data" style={{ color: 'var(--text)' }}>{item.available}</td>
                    <td className="px-4 py-3 font-mono-data" style={{ color: 'var(--muted)' }}>{item.reserved}</td>
                    <td className="px-4 py-3 font-mono-data" style={{ color: 'var(--muted)' }}>{item.reorder}</td>
                    <td className="px-4 py-3"><StatusPill label={status.label} variant={status.variant} /></td>
                    <td className="px-4 py-3 text-right">
                      <button
                        onClick={() => setAdjusting(item)}
                        className="inline-flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-medium rounded-md"
                        style={{ border: '1px solid var(--paper-line)', color: 'var(--text)' }}
                      >
                        <SlidersHorizontal size={13} />
                        Adjust
                      </button>
                    </td>
                  </tr>
                )
              })}
              {filtered.length === 0 && (
                <tr>
                  <td colSpan={8} className="px-4 py-8 text-center text-sm" style={{ color: 'var(--muted)' }}>
                    No SKUs match "{query}".
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {history.length > 0 && (
        <div className="mt-5">
          <h2 className="text-sm font-medium" style={{ color: 'var(--text)' }}>Recent adjustments</h2>
          <div
            className="mt-2 rounded-lg overflow-hidden text-sm"
            style={{ background: 'var(--paper-panel)', border: '1px solid var(--paper-line)' }}
          >
            {history.map((h, idx) => (
              <div
                key={idx}
                className="flex items-center justify-between px-4 py-2.5"
                style={{ borderBottom: idx < history.length - 1 ? '1px solid var(--paper-line)' : 'none' }}
              >
                <div className="flex items-center gap-3">
                  <span className="font-mono-data text-xs" style={{ color: 'var(--text)' }}>{h.sku}</span>
                  <span
                    className="font-mono-data text-xs font-medium"
                    style={{ color: h.delta > 0 ? 'var(--signal-green)' : 'var(--signal-red)' }}
                  >
                    {h.delta > 0 ? `+${h.delta}` : h.delta}
                  </span>
                  <span className="text-xs" style={{ color: 'var(--muted)' }}>{h.reason}{h.note ? ` — ${h.note}` : ''}</span>
                </div>
                <span className="text-xs" style={{ color: 'var(--muted)' }}>{h.at}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {adjusting && (
        <AdjustModal
          item={adjusting}
          onClose={() => setAdjusting(null)}
          onConfirm={handleAdjustConfirm}
        />
      )}
    </div>
  )
}
