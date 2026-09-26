import { useState } from 'react'
import { PackageSearch, Plus, X, Pencil, Power } from 'lucide-react'
import StatusPill from '../../components/common/StatusPill'
import { useWarex } from '../../context/WarexContext'

const CATEGORIES = ['Television', 'Air Conditioner', 'Refrigerator', 'Microwave', 'Accessories']

const INITIAL_SKUS = [
  { code: 'TV-55-4K-SAM', name: 'Samsung 55" 4K Smart TV', category: 'Television', cartonSize: 1, reorder: 20, assembly: true, active: true },
  { code: 'TV-43-4K-SAM', name: 'Samsung 43" 4K Smart TV', category: 'Television', cartonSize: 1, reorder: 15, assembly: true, active: true },
  { code: 'AC-1.5T-SPLIT-LG', name: 'LG 1.5 Ton Split AC', category: 'Air Conditioner', cartonSize: 1, reorder: 10, assembly: true, active: true },
  { code: 'AC-1T-SPLIT-VOLTAS', name: 'Voltas 1 Ton Split AC', category: 'Air Conditioner', cartonSize: 1, reorder: 8, assembly: true, active: true },
  { code: 'MW-20L-SOLO-IFB', name: 'IFB 20L Solo Microwave', category: 'Microwave', cartonSize: 1, reorder: 15, assembly: false, active: true },
  { code: 'CHG-65W-USB-C', name: '65W USB-C Fast Charger', category: 'Accessories', cartonSize: 50, reorder: 100, assembly: false, active: true },
  { code: 'CBL-HDMI-2M', name: 'HDMI Cable 2m', category: 'Accessories', cartonSize: 100, reorder: 100, assembly: false, active: false },
  { code: 'RF-190L-DIR-WHIRL', name: 'Whirlpool 190L Direct-Cool Fridge', category: 'Refrigerator', cartonSize: 1, reorder: 12, assembly: true, active: true },
]

const EMPTY_FORM = { code: '', name: '', category: CATEGORIES[0], cartonSize: 1, reorder: 10, assembly: false, price: 1000 }

function SkuModal({ initial, existingCodes, onClose, onSave }) {
  const isEdit = Boolean(initial)
  const [form, setForm] = useState(initial || EMPTY_FORM)
  const [error, setError] = useState('')

  function update(field, value) {
    setForm((f) => ({ ...f, [field]: value }))
  }

  function handleSubmit(e) {
    e.preventDefault()
    const code = form.code.trim().toUpperCase()
    if (!code || !form.name.trim()) {
      setError('SKU code and product name are required.')
      return
    }
    if (!isEdit && existingCodes.includes(code)) {
      setError('This SKU code already exists — codes must be unique.')
      return
    }
    onSave({ ...form, code, price: Number(form.price), cartonSize: Number(form.cartonSize), reorder: Number(form.reorder) })
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
            {isEdit ? 'Edit SKU' : 'Add new SKU'}
          </h2>
          <button type="button" onClick={onClose} aria-label="Close" style={{ color: 'var(--muted)' }}>
            <X size={18} />
          </button>
        </div>

        <div className="mt-4 space-y-3">
          <div>
            <label className="block text-xs font-medium mb-1" style={{ color: 'var(--text)' }}>
              SKU code {isEdit && <span style={{ color: 'var(--muted)' }}>(locked)</span>}
            </label>
            <input
              value={form.code}
              onChange={(e) => update('code', e.target.value)}
              disabled={isEdit}
              placeholder="e.g. TV-55-4K-SAM"
              className="w-full px-2.5 py-2 text-sm rounded-md outline-none font-mono-data"
              style={{
                background: isEdit ? 'var(--paper)' : 'var(--paper-panel)',
                border: '1px solid var(--paper-line)',
                color: isEdit ? 'var(--muted)' : 'var(--text)',
              }}
            />
          </div>

          <div>
            <label className="block text-xs font-medium mb-1" style={{ color: 'var(--text)' }}>Product name</label>
            <input
              value={form.name}
              onChange={(e) => update('name', e.target.value)}
              placeholder="e.g. Samsung 55&quot; 4K Smart TV"
              className="w-full px-2.5 py-2 text-sm rounded-md outline-none"
              style={{ background: 'var(--paper-panel)', border: '1px solid var(--paper-line)', color: 'var(--text)' }}
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium mb-1" style={{ color: 'var(--text)' }}>Category</label>
              <select
                value={form.category}
                onChange={(e) => update('category', e.target.value)}
                className="w-full px-2.5 py-2 text-sm rounded-md outline-none"
                style={{ background: 'var(--paper-panel)', border: '1px solid var(--paper-line)', color: 'var(--text)' }}
              >
                {CATEGORIES.map((c) => <option key={c} value={c}>{c}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium mb-1" style={{ color: 'var(--text)' }}>Units / carton</label>
              <input
                type="number"
                min={1}
                value={form.cartonSize}
                onChange={(e) => update('cartonSize', e.target.value)}
                className="w-full px-2.5 py-2 text-sm rounded-md outline-none font-mono-data"
                style={{ background: 'var(--paper-panel)', border: '1px solid var(--paper-line)', color: 'var(--text)' }}
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-medium mb-1" style={{ color: 'var(--text)' }}>Unit price (₹)</label>
            <input type="number" min={0} value={form.price} onChange={(e) => update('price', e.target.value)} className="w-full px-2.5 py-2 text-sm rounded-md outline-none font-mono-data" style={{ background: 'var(--paper-panel)', border: '1px solid var(--paper-line)', color: 'var(--text)' }} />
          </div>

          <div>
            <label className="block text-xs font-medium mb-1" style={{ color: 'var(--text)' }}>Reorder threshold</label>
            <input
              type="number"
              min={0}
              value={form.reorder}
              onChange={(e) => update('reorder', e.target.value)}
              className="w-full px-2.5 py-2 text-sm rounded-md outline-none font-mono-data"
              style={{ background: 'var(--paper-panel)', border: '1px solid var(--paper-line)', color: 'var(--text)' }}
            />
          </div>

          <label className="flex items-center gap-2 text-sm" style={{ color: 'var(--text)' }}>
            <input
              type="checkbox"
              checked={form.assembly}
              onChange={(e) => update('assembly', e.target.checked)}
            />
            Requires assembly / setup on delivery
          </label>

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
            {isEdit ? 'Save changes' : 'Add SKU'}
          </button>
        </div>
      </form>
    </div>
  )
}

export default function Products() {
  const { products: skus, createProduct, updateProduct, toggleProduct } = useWarex()
  const [modal, setModal] = useState(null) // 'add' | sku object | null

  const activeCount = skus.filter((s) => s.active).length

  function handleSave(data) {
    if (modal === 'add') createProduct({ ...data, active: true })
    else updateProduct(modal.code, data)
    setModal(null)
  }

  function toggleActive(code) { toggleProduct(code) }

  return (
    <div>
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <div className="flex items-center gap-2">
            <PackageSearch size={18} style={{ color: 'var(--accent-dim)' }} />
            <h1 className="text-xl font-semibold" style={{ color: 'var(--text)' }}>Products / SKUs</h1>
          </div>
          <p className="mt-1 text-sm" style={{ color: 'var(--muted)' }}>
            {activeCount} active of {skus.length} total SKUs.
          </p>
        </div>
        <button
          onClick={() => setModal('add')}
          className="inline-flex items-center gap-1.5 px-3 py-2 text-sm font-medium rounded-md"
          style={{ background: 'var(--accent)', color: 'var(--accent-ink)' }}
        >
          <Plus size={15} />
          Add SKU
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
                {['SKU', 'Name', 'Category', 'Carton size', 'Reorder at', 'Assembly', 'Status', ''].map((h) => (
                  <th key={h} className="text-left px-4 py-2.5 text-xs font-medium" style={{ color: 'var(--muted)' }}>
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {skus.map((s) => (
                <tr key={s.code} style={{ borderBottom: '1px solid var(--paper-line)', opacity: s.active ? 1 : 0.55 }}>
                  <td className="px-4 py-3 font-mono-data text-xs" style={{ color: 'var(--text)' }}>{s.code}</td>
                  <td className="px-4 py-3" style={{ color: 'var(--text)' }}>{s.name}</td>
                  <td className="px-4 py-3" style={{ color: 'var(--muted)' }}>{s.category}</td>
                  <td className="px-4 py-3 font-mono-data" style={{ color: 'var(--muted)' }}>{s.cartonSize}</td>
                  <td className="px-4 py-3 font-mono-data" style={{ color: 'var(--muted)' }}>{s.reorder}</td>
                  <td className="px-4 py-3">
                    {s.assembly
                      ? <StatusPill label="Required" variant="amber" />
                      : <span className="text-xs" style={{ color: 'var(--muted)' }}>—</span>}
                  </td>
                  <td className="px-4 py-3">
                    <StatusPill label={s.active ? 'Active' : 'Inactive'} variant={s.active ? 'green' : 'neutral'} />
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center justify-end gap-1.5">
                      <button
                        onClick={() => setModal(s)}
                        aria-label={`Edit ${s.name}`}
                        className="p-1.5 rounded-md"
                        style={{ border: '1px solid var(--paper-line)', color: 'var(--text)' }}
                      >
                        <Pencil size={13} />
                      </button>
                      <button
                        onClick={() => toggleActive(s.code)}
                        aria-label={s.active ? `Deactivate ${s.name}` : `Activate ${s.name}`}
                        className="p-1.5 rounded-md"
                        style={{
                          border: '1px solid var(--paper-line)',
                          color: s.active ? 'var(--signal-red)' : 'var(--signal-green)',
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
        <SkuModal
          initial={modal === 'add' ? null : modal}
          existingCodes={skus.map((s) => s.code)}
          onClose={() => setModal(null)}
          onSave={handleSave}
        />
      )}
    </div>
  )
}
