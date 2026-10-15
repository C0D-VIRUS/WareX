import { useEffect, useMemo, useState } from 'react'
import { MessageSquareWarning, Plus, X, Undo2, FileWarning, PackageCheck } from 'lucide-react'
import StatusPill from '../../components/common/StatusPill'
import { useWarex } from '../../context/WarexContext'

export default function ReturnsComplaints({ session }) {
  const { orders, complaints, returns = [], createComplaint, createReturn } = useWarex()
  const [complaintOpen, setComplaintOpen] = useState(false)
  const [returnOpen, setReturnOpen] = useState(false)
  const [saving, setSaving] = useState(false)
  const [formError, setFormError] = useState('')
  const [complaintForm, setComplaintForm] = useState({ orderId: '', subject: '', description: '' })
  const [returnForm, setReturnForm] = useState({ orderId: '', skuId: '', reason: '' })
  const mineOrders = useMemo(() => orders.filter((order) => order.customerEmail === session.email), [orders, session.email])
  const eligibleOrders = useMemo(() => mineOrders.filter((order) => ['Delivered', 'Closed'].includes(order.status)), [mineOrders])
  const mineComplaints = useMemo(() => complaints.filter((complaint) => complaint.customerEmail === session.email), [complaints, session.email])
  const mineReturns = useMemo(() => returns.filter((item) => item.customerEmail === session.email), [returns, session.email])
  const selectedReturnOrder = eligibleOrders.find((order) => order.id === returnForm.orderId)

  useEffect(() => {
    if (!complaintForm.orderId && mineOrders.length) setComplaintForm((current) => ({ ...current, orderId: mineOrders[0].id }))
    if (!returnForm.orderId && eligibleOrders.length) setReturnForm((current) => ({ ...current, orderId: eligibleOrders[0].id, skuId: '' }))
  }, [complaintForm.orderId, returnForm.orderId, mineOrders, eligibleOrders])

  async function submitComplaint(event) {
    event.preventDefault()
    setFormError('')
    if (!complaintForm.subject.trim() || !complaintForm.description.trim()) { setFormError('Enter both a subject and a description.'); return }
    setSaving(true)
    const result = await createComplaint({ email: session.email, name: session.name }, complaintForm)
    setSaving(false)
    if (result) { setComplaintOpen(false); setComplaintForm({ orderId: '', subject: '', description: '' }) }
    else setFormError('Complaint was not saved. Review the error notification and try again.')
  }

  async function submitReturn(event) {
    event.preventDefault()
    setFormError('')
    if (!returnForm.orderId || !returnForm.reason.trim()) { setFormError('Select a delivered order and enter a return reason.'); return }
    setSaving(true)
    const result = await createReturn(returnForm)
    setSaving(false)
    if (result) { setReturnOpen(false); setReturnForm({ orderId: '', skuId: '', reason: '' }) }
    else setFormError('Return request was not saved. Review the error notification and try again.')
  }

  return <div className="page-stack">
    <header className="page-heading"><div className="page-heading-icon"><MessageSquareWarning size={20} /></div><div><p className="eyebrow">CUSTOMER SUPPORT</p><h1>Returns & complaints</h1><p>Track after-sales cases and submit returns only for orders recorded as delivered.</p></div></header>

    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3"><div className="metric-card"><div className="metric-card-top"><span className="metric-label">Open complaints</span><span className="metric-icon metric-icon-orange"><FileWarning size={17} /></span></div><strong>{mineComplaints.filter((item) => !['Resolved', 'Closed'].includes(item.status)).length}</strong><span className="metric-note">Issues awaiting resolution</span></div><div className="metric-card"><div className="metric-card-top"><span className="metric-label">Active returns</span><span className="metric-icon metric-icon-blue"><Undo2 size={17} /></span></div><strong>{mineReturns.filter((item) => !['Closed', 'Rejected'].includes(item.status)).length}</strong><span className="metric-note">Requests being reviewed or processed</span></div></div>

    <section><div className="section-heading"><div><h2>Return requests</h2><p>Choose an eligible delivered order and select a product or all items.</p></div><button className="btn-primary" onClick={() => { setReturnOpen(true); setFormError('') }} disabled={eligibleOrders.length === 0}><Plus size={15} /> Request return</button></div><div className="grid grid-cols-1 xl:grid-cols-2 gap-3">{mineReturns.map((item) => <article key={item.id} className="work-card"><div className="work-card-top"><div><span className="record-id">{item.id}</span><h3>{item.order} · {item.sku}</h3><p>Submitted {item.createdAt}</p></div><StatusPill label={item.status} variant={item.status === 'Closed' ? 'green' : item.status === 'Rejected' ? 'red' : 'amber'} /></div><p className="return-reason">{item.reason}</p></article>)}{mineReturns.length === 0 && <div className="empty-state xl:col-span-2"><div className="empty-state-icon"><Undo2 size={22} /></div><h3>No return requests yet</h3><p>{eligibleOrders.length ? 'You can request a return for a delivered order.' : 'A return option will become available after one of your orders is delivered.'}</p></div>}</div></section>

    <section><div className="section-heading"><div><h2>Complaints & service cases</h2><p>Follow issues through review, assignment and resolution.</p></div><button className="btn-secondary" onClick={() => { setComplaintOpen(true); setFormError('') }}><Plus size={15} /> Raise complaint</button></div><div className="grid grid-cols-1 xl:grid-cols-2 gap-3">{mineComplaints.map((item) => <article key={item.id} className="work-card"><div className="work-card-top"><div><span className="record-id">{item.id}</span><h3>{item.subject}</h3><p>{item.orderId || 'General issue'}</p></div><StatusPill label={item.status} variant={item.status === 'Resolved' || item.status === 'Closed' ? 'green' : item.status === 'Service Assigned' ? 'amber' : 'red'} /></div><p className="return-reason">{item.description}</p></article>)}{mineComplaints.length === 0 && <div className="empty-state xl:col-span-2"><div className="empty-state-icon"><FileWarning size={22} /></div><h3>No complaints on record</h3><p>Raise a complaint if an order or delivered product needs attention.</p></div>}</div></section>

    {returnOpen && <div className="fixed inset-0 z-40 flex items-center justify-center px-4 py-6"><button className="absolute inset-0 bg-black/45" aria-label="Close return form" onClick={() => setReturnOpen(false)} /><form onSubmit={submitReturn} className="form-panel relative z-10 w-full max-w-lg" style={{ background: 'var(--paper-panel)', borderColor: 'var(--paper-line)', boxShadow: '0 24px 80px rgba(0,0,0,.22)' }}><div className="flex items-start justify-between gap-4"><div className="form-panel-heading"><div className="page-heading-icon"><Undo2 size={18} /></div><div><h3>Request a return</h3><p>Only delivered or closed orders can be returned.</p></div></div><button type="button" className="btn-secondary" onClick={() => setReturnOpen(false)} aria-label="Close"><X size={15} /></button></div><div className="grid gap-3"><label className="field-label">Order<select required value={returnForm.orderId} onChange={(event) => setReturnForm((current) => ({ ...current, orderId: event.target.value, skuId: '' }))}><option value="">Choose delivered order</option>{eligibleOrders.map((order) => <option key={order.id} value={order.id}>{order.id} · {order.status}</option>)}</select></label><label className="field-label">Product<select value={returnForm.skuId} onChange={(event) => setReturnForm((current) => ({ ...current, skuId: event.target.value }))}><option value="">All items in this order</option>{(selectedReturnOrder?.items || []).map((item) => <option key={item.skuId} value={item.skuId}>{item.sku} — {item.name}</option>)}</select></label><label className="field-label">Reason for return<textarea required rows={3} value={returnForm.reason} onChange={(event) => setReturnForm((current) => ({ ...current, reason: event.target.value }))} placeholder="Describe the issue and condition of the item." /></label></div>{formError && <p className="form-error">{formError}</p>}<div className="flex gap-2 mt-5"><button className="btn-primary" disabled={saving}>{saving ? 'Submitting…' : 'Submit return'}</button><button type="button" className="btn-secondary" onClick={() => setReturnOpen(false)}>Cancel</button></div></form></div>}

    {complaintOpen && <div className="fixed inset-0 z-40 flex items-center justify-center px-4 py-6"><button className="absolute inset-0 bg-black/45" aria-label="Close complaint form" onClick={() => setComplaintOpen(false)} /><form onSubmit={submitComplaint} className="form-panel relative z-10 w-full max-w-lg" style={{ background: 'var(--paper-panel)', borderColor: 'var(--paper-line)', boxShadow: '0 24px 80px rgba(0,0,0,.22)' }}><div className="flex items-start justify-between gap-4"><div className="form-panel-heading"><div className="page-heading-icon"><FileWarning size={18} /></div><div><h3>Raise a complaint</h3><p>Provide enough detail for the service team to investigate.</p></div></div><button type="button" className="btn-secondary" onClick={() => setComplaintOpen(false)} aria-label="Close"><X size={15} /></button></div><div className="grid gap-3"><label className="field-label">Related order (optional)<select value={complaintForm.orderId} onChange={(event) => setComplaintForm((current) => ({ ...current, orderId: event.target.value }))}><option value="">General issue</option>{mineOrders.map((order) => <option key={order.id} value={order.id}>{order.id}</option>)}</select></label><label className="field-label">Subject<input required value={complaintForm.subject} onChange={(event) => setComplaintForm((current) => ({ ...current, subject: event.target.value }))} placeholder="e.g. Damaged item received" /></label><label className="field-label">Description<textarea required rows={4} value={complaintForm.description} onChange={(event) => setComplaintForm((current) => ({ ...current, description: event.target.value }))} placeholder="Explain what happened and what resolution you need." /></label></div>{formError && <p className="form-error">{formError}</p>}<div className="flex gap-2 mt-5"><button className="btn-primary" disabled={saving}>{saving ? 'Submitting…' : 'Submit complaint'}</button><button type="button" className="btn-secondary" onClick={() => setComplaintOpen(false)}>Cancel</button></div></form></div>}
  </div>
}
