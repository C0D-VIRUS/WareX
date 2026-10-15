import { useEffect, useMemo, useState } from 'react'
import { ArrowLeftRight, Plus, X, Truck, PackageCheck, Boxes } from 'lucide-react'
import StatusPill from '../../components/common/StatusPill'
import { useWarex } from '../../context/WarexContext'

export default function Transfers({ session }) {
  const { transfers = [], warehouses = [], products = [], createTransfer, dispatchTransfer, receiveTransfer } = useWarex()
  const [open, setOpen] = useState(false)
  const [busyId, setBusyId] = useState(null)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [form, setForm] = useState({ fromWarehouseId: '', toWarehouseId: '', skuId: '', quantity: '5' })
  const sourceWarehouses = useMemo(() => warehouses.filter((warehouse) => warehouse.active !== false && (session.roleId === 'admin' || warehouse.managerId === session.userId)), [warehouses, session.roleId, session.userId])
  const destinationWarehouses = useMemo(() => warehouses.filter((warehouse) => warehouse.active !== false && warehouse.dbId !== form.fromWarehouseId), [warehouses, form.fromWarehouseId])
  const activeProducts = useMemo(() => products.filter((product) => product.active), [products])

  useEffect(() => {
    setForm((current) => ({
      ...current,
      fromWarehouseId: sourceWarehouses.some((warehouse) => warehouse.dbId === current.fromWarehouseId) ? current.fromWarehouseId : (sourceWarehouses[0]?.dbId || ''),
      toWarehouseId: destinationWarehouses.some((warehouse) => warehouse.dbId === current.toWarehouseId) ? current.toWarehouseId : (destinationWarehouses[0]?.dbId || ''),
      skuId: activeProducts.some((product) => product.dbId === current.skuId) ? current.skuId : (activeProducts[0]?.dbId || ''),
    }))
  }, [sourceWarehouses, destinationWarehouses, activeProducts])

  async function submit(event) {
    event.preventDefault()
    setError('')
    if (!form.fromWarehouseId || !form.toWarehouseId || !form.skuId) {
      setError('Select a source warehouse, destination warehouse and active SKU.')
      return
    }
    if (form.fromWarehouseId === form.toWarehouseId) {
      setError('Source and destination must be different warehouses.')
      return
    }
    const quantity = Number(form.quantity)
    if (!Number.isInteger(quantity) || quantity <= 0) {
      setError('Quantity must be a positive whole number.')
      return
    }
    setSaving(true)
    const saved = await createTransfer({ fromWarehouseId: form.fromWarehouseId, toWarehouseId: form.toWarehouseId, items: [{ skuId: form.skuId, quantity }] })
    setSaving(false)
    if (saved) setOpen(false)
    else setError('Transfer was not saved. Check the error notification and try again.')
  }

  async function action(transfer, type) {
    setBusyId(transfer.id)
    if (type === 'dispatch') await dispatchTransfer(transfer.id)
    else await receiveTransfer(transfer.id)
    setBusyId(null)
  }

  const requested = transfers.filter((transfer) => transfer.status === 'Requested').length
  const inTransit = transfers.filter((transfer) => transfer.status === 'In transit').length
  const received = transfers.filter((transfer) => transfer.status === 'Received').length

  return <div className="page-stack">
    <header className="page-heading"><div className="page-heading-icon"><ArrowLeftRight size={20} /></div><div><p className="eyebrow">INVENTORY MOVEMENT</p><h1>Warehouse transfers</h1><p>Move stock between warehouse nodes with dispatch and receiving transactions recorded against inventory.</p></div></header>
    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3"><div className="metric-card"><span className="metric-label">Awaiting dispatch</span><strong>{requested}</strong><span className="metric-note">Requests awaiting source check</span></div><div className="metric-card"><span className="metric-label">In transit</span><strong>{inTransit}</strong><span className="metric-note">Incoming quantities reserved</span></div><div className="metric-card"><span className="metric-label">Received</span><strong>{received}</strong><span className="metric-note">Stock reconciled at destination</span></div></div>

    <section><div className="section-heading"><div><h2>Transfer register</h2><p>Dispatch deducts stock at origin; receipt adds stock at destination.</p></div><button className="btn-primary" onClick={() => { setOpen(true); setError('') }}><Plus size={15} /> New transfer</button></div>
      <div className="table-shell"><div className="overflow-x-auto"><table className="data-table"><thead><tr>{['Transfer','From warehouse','To warehouse','Products / qty','Created','Status','Action'].map((heading) => <th key={heading}>{heading}</th>)}</tr></thead><tbody>{transfers.map((transfer) => {
        const canDispatch = transfer.status === 'Requested' && (session.roleId === 'admin' || transfer.fromManagerId === session.userId)
        const canReceive = transfer.status === 'In transit' && (session.roleId === 'admin' || transfer.toManagerId === session.userId)
        return <tr key={transfer.id}><td className="record-id">{transfer.id}</td><td>{transfer.from}</td><td>{transfer.to}</td><td><div className="transfer-items">{transfer.items.map((item) => <span key={item.skuId}>{item.sku} <b>× {item.qty}</b></span>)}</div></td><td>{transfer.createdAt}</td><td><StatusPill label={transfer.status} variant={transfer.status === 'Received' ? 'green' : transfer.status === 'In transit' ? 'amber' : 'neutral'} /></td><td>{canDispatch ? <button disabled={busyId === transfer.id} onClick={() => action(transfer, 'dispatch')} className="btn-small"><Truck size={12} /> {busyId === transfer.id ? 'Working…' : 'Dispatch'}</button> : canReceive ? <button disabled={busyId === transfer.id} onClick={() => action(transfer, 'receive')} className="btn-small"><PackageCheck size={12} /> {busyId === transfer.id ? 'Working…' : 'Receive stock'}</button> : transfer.status === 'Received' ? <span className="success-note"><PackageCheck size={13} /> Reconciled</span> : <span className="subtle-note">Awaiting assigned warehouse</span>}</td></tr>
      })}{transfers.length === 0 && <tr><td colSpan={7}><div className="empty-inline">No transfers yet. Create a request to move stock between active warehouses.</div></td></tr>}</tbody></table></div></div>
    </section>

    {open && <div className="fixed inset-0 z-40 flex items-center justify-center px-4 py-6"><button aria-label="Close transfer form" className="absolute inset-0 bg-black/45" onClick={() => setOpen(false)} /><form onSubmit={submit} className="form-panel relative z-10 w-full max-w-xl max-h-[90vh] overflow-y-auto" style={{ background: 'var(--paper-panel)', borderColor: 'var(--paper-line)', boxShadow: '0 24px 80px rgba(0,0,0,.22)' }}><div className="flex items-start justify-between gap-4"><div className="form-panel-heading"><div className="page-heading-icon"><Boxes size={18} /></div><div><h3>Create stock transfer</h3><p>The source quantity is checked again when you dispatch.</p></div></div><button type="button" className="btn-secondary" aria-label="Close" onClick={() => setOpen(false)}><X size={15} /></button></div>
      {sourceWarehouses.length === 0 && <p className="form-error">No active warehouse is assigned to your account. Ask the Main Admin to assign your warehouse before creating transfers.</p>}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3"><label className="field-label">Source warehouse<select required value={form.fromWarehouseId} onChange={(event) => setForm((current) => ({ ...current, fromWarehouseId: event.target.value, toWarehouseId: current.toWarehouseId === event.target.value ? '' : current.toWarehouseId }))}><option value="">Choose source</option>{sourceWarehouses.map((warehouse) => <option key={warehouse.dbId} value={warehouse.dbId}>{warehouse.name} · {warehouse.city}</option>)}</select></label><label className="field-label">Destination warehouse<select required value={form.toWarehouseId} onChange={(event) => setForm((current) => ({ ...current, toWarehouseId: event.target.value }))}><option value="">Choose destination</option>{destinationWarehouses.map((warehouse) => <option key={warehouse.dbId} value={warehouse.dbId}>{warehouse.name} · {warehouse.city}</option>)}</select></label><label className="field-label sm:col-span-2">Product / SKU<select required value={form.skuId} onChange={(event) => setForm((current) => ({ ...current, skuId: event.target.value }))}><option value="">Choose product</option>{activeProducts.map((product) => <option key={product.dbId} value={product.dbId}>{product.code} — {product.name}</option>)}</select></label><label className="field-label sm:col-span-2">Quantity to transfer<input required type="number" min="1" step="1" value={form.quantity} onChange={(event) => setForm((current) => ({ ...current, quantity: event.target.value }))} /></label></div>
      {error && <p className="form-error">{error}</p>}<div className="flex flex-wrap gap-2 mt-5"><button className="btn-primary" disabled={saving || sourceWarehouses.length === 0 || destinationWarehouses.length === 0 || activeProducts.length === 0}>{saving ? 'Creating…' : 'Create transfer request'}</button><button type="button" className="btn-secondary" onClick={() => setOpen(false)}>Cancel</button></div>
    </form></div>}
  </div>
}
