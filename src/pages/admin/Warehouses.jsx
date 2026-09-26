import { useState } from 'react'
import { Warehouse as WarehouseIcon, Plus, X, Pencil, Power } from 'lucide-react'
import StatusPill from '../../components/common/StatusPill'

const INITIAL_WAREHOUSES = [
  { id: 'WH-01', name: 'Chakan Warehouse', city: 'Pune', zones: 4, bins: 120, active: true },
  { id: 'WH-02', name: 'Bhiwandi Hub', city: 'Mumbai', zones: 6, bins: 210, active: true },
  { id: 'WH-03', name: 'Talegaon Facility', city: 'Pune', zones: 3, bins: 90, active: true },
  { id: 'WH-04', name: 'Nagpur East Depot', city: 'Nagpur', zones: 2, bins: 60, active: false },
]

const EMPTY_FORM = { name: '', city: '', zones: 1, bins: 20 }

function WarehouseModal({ initial, onClose, onSave }) {
  const isEdit = Boolean(initial)
  const [form, setForm] = useState(initial || EMPTY_FORM)
  const [error, setError] = useState('')

  function update(field, value) {
    setForm((f) => ({ ...f, [field]: value }))
  }

  function handleSubmit(e) {
    e.preventDefault()
    if (!form.name.trim() || !form.city.trim()) {
      setError('Warehouse name and city are required.')
      return
    }
    onSave({ ...form, zones: Number(form.zones), bins: Number(form.bins) })
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
          <h2 className="text-base font-semibold" style={{ color: 'var(--text)' }}>
            {isEdit ? 'Edit warehouse' : 'Add warehouse'}
          </h2>
          <button type="button" onClick={onClose} aria-label="Close" style={{ color: 'var(--muted)' }}>
            <X size={18} />
          </button>
        </div>

        <div className="mt-4 space-y-3">
          <div>
            <label className="block text-xs font-medium mb-1" style={{ color: 'var(--text)' }}>Warehouse name</label>
            <input
              value={form.name}
              onChange={(e) => update('name', e.target.value)}
              placeholder="e.g. Chakan Warehouse"
              className="w-full px-2.5 py-2 text-sm rounded-md outline-none"
              style={{ background: 'var(--paper-panel)', border: '1px solid var(--paper-line)', color: 'var(--text)' }}
            />
          </div>

          <div>
            <label className="block text-xs font-medium mb-1" style={{ color: 'var(--text)' }}>City</label>
            <input
              value={form.city}
              onChange={(e) => update('city', e.target.value)}
              placeholder="e.g. Pune"
              className="w-full px-2.5 py-2 text-sm rounded-md outline-none"
              style={{ background: 'var(--paper-panel)', border: '1px solid var(--paper-line)', color: 'var(--text)' }}
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium mb-1" style={{ color: 'var(--text)' }}>Number of zones</label>
              <input
                type="number"
                min={1}
                value={form.zones}
                onChange={(e) => update('zones', e.target.value)}
                className="w-full px-2.5 py-2 text-sm rounded-md outline-none font-mono-data"
                style={{ background: 'var(--paper-panel)', border: '1px solid var(--paper-line)', color: 'var(--text)' }}
              />
            </div>
            <div>
              <label className="block text-xs font-medium mb-1" style={{ color: 'var(--text)' }}>Total bins</label>
              <input
                type="number"
                min={1}
                value={form.bins}
                onChange={(e) => update('bins', e.target.value)}
                className="w-full px-2.5 py-2 text-sm rounded-md outline-none font-mono-data"
                style={{ background: 'var(--paper-panel)', border: '1px solid var(--paper-line)', color: 'var(--text)' }}
              />
            </div>
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
            {isEdit ? 'Save changes' : 'Add warehouse'}
          </button>
        </div>
      </form>
    </div>
  )
}

export default function Warehouses() {
  const [warehouses, setWarehouses] = useState(INITIAL_WAREHOUSES)
  const [modal, setModal] = useState(null) // 'add' | warehouse object | null
  let nextIdNum = warehouses.length + 1

  function handleSave(data) {
    if (modal === 'add') {
      const id = `WH-${String(nextIdNum).padStart(2, '0')}`
      setWarehouses((prev) => [...prev, { ...data, id, active: true }])
    } else {
      setWarehouses((prev) => prev.map((w) => (w.id === modal.id ? { ...w, ...data } : w)))
    }
    setModal(null)
  }

  function toggleActive(id) {
    setWarehouses((prev) => prev.map((w) => (w.id === id ? { ...w, active: !w.active } : w)))
  }

  const activeCount = warehouses.filter((w) => w.active).length

  return (
    <div>
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <div className="flex items-center gap-2">
            <WarehouseIcon size={18} style={{ color: 'var(--accent-dim)' }} />
            <h1 className="text-xl font-semibold" style={{ color: 'var(--text)' }}>Warehouses</h1>
          </div>
          <p className="mt-1 text-sm" style={{ color: 'var(--muted)' }}>
            {activeCount} active of {warehouses.length} total warehouses.
          </p>
        </div>
        <button
          onClick={() => setModal('add')}
          className="inline-flex items-center gap-1.5 px-3 py-2 text-sm font-medium rounded-md"
          style={{ background: 'var(--accent)', color: 'var(--accent-ink)' }}
        >
          <Plus size={15} />
          Add warehouse
        </button>
      </div>

      <div
        className="mt-5 rounded-lg overflow-hidden"
        style={{ background: 'var(--paper-panel)', border: '1px solid var(--paper-line)' }}
      >
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr style={{ borderBottom: '1px solid var(--paper-line)' }}>
                {['ID', 'Name', 'City', 'Zones', 'Total bins', 'Status', ''].map((h) => (
                  <th key={h} className="text-left px-4 py-2.5 text-xs font-medium" style={{ color: 'var(--muted)' }}>
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {warehouses.map((w) => (
                <tr key={w.id} style={{ borderBottom: '1px solid var(--paper-line)', opacity: w.active ? 1 : 0.55 }}>
                  <td className="px-4 py-3 font-mono-data text-xs" style={{ color: 'var(--text)' }}>{w.id}</td>
                  <td className="px-4 py-3" style={{ color: 'var(--text)' }}>{w.name}</td>
                  <td className="px-4 py-3" style={{ color: 'var(--muted)' }}>{w.city}</td>
                  <td className="px-4 py-3 font-mono-data" style={{ color: 'var(--muted)' }}>{w.zones}</td>
                  <td className="px-4 py-3 font-mono-data" style={{ color: 'var(--muted)' }}>{w.bins}</td>
                  <td className="px-4 py-3">
                    <StatusPill label={w.active ? 'Active' : 'Inactive'} variant={w.active ? 'green' : 'neutral'} />
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center justify-end gap-1.5">
                      <button
                        onClick={() => setModal(w)}
                        aria-label={`Edit ${w.name}`}
                        className="p-1.5 rounded-md"
                        style={{ border: '1px solid var(--paper-line)', color: 'var(--text)' }}
                      >
                        <Pencil size={13} />
                      </button>
                      <button
                        onClick={() => toggleActive(w.id)}
                        aria-label={w.active ? `Deactivate ${w.name}` : `Activate ${w.name}`}
                        className="p-1.5 rounded-md"
                        style={{
                          border: '1px solid var(--paper-line)',
                          color: w.active ? 'var(--signal-red)' : 'var(--signal-green)',
                        }}
                      >
                        <Power size={13} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {modal && (
        <WarehouseModal
          initial={modal === 'add' ? null : modal}
          onClose={() => setModal(null)}
          onSave={handleSave}
        />
      )}
    </div>
  )
}
