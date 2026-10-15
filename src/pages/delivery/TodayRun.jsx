import { useState } from 'react'
import { Route, MapPin, PackageCheck, CheckCircle2, ClipboardCheck, Truck } from 'lucide-react'
import StatusPill from '../../components/common/StatusPill'
import { useWarex } from '../../context/WarexContext'

const steps = ['Assigned', 'Out for delivery', 'Delivered']

export default function TodayRun({ session }) {
  const { shipments, updateShipment, recordProofOfDelivery } = useWarex()
  const [proofFor, setProofFor] = useState(null)
  const [proof, setProof] = useState({ reference: '', notes: '' })
  const [busyId, setBusyId] = useState(null)
  const mine = shipments.filter((shipment) => shipment.deliveryEmail?.toLowerCase() === session.email?.toLowerCase())

  async function startDelivery(shipment) {
    setBusyId(shipment.id)
    await updateShipment(shipment.id, 'Out for delivery')
    setBusyId(null)
  }

  async function submitProof(event, shipment) {
    event.preventDefault()
    setBusyId(shipment.id)
    const saved = await recordProofOfDelivery(shipment.id, proof)
    if (saved) {
      setProofFor(null)
      setProof({ reference: '', notes: '' })
    }
    setBusyId(null)
  }

  async function completeDelivery(shipment) {
    setBusyId(shipment.id)
    await updateShipment(shipment.id, 'Delivered')
    setBusyId(null)
  }

  return (
    <div className="page-stack">
      <header className="page-heading">
        <div className="page-heading-icon"><Route size={20} /></div>
        <div>
          <p className="eyebrow">DELIVERY OPERATIONS</p>
          <h1>Today's run</h1>
          <p>Move each assigned shipment through dispatch, proof of handover and completion.</p>
        </div>
        <div className="page-heading-side"><span className="live-indicator" /> Live assignments</div>
      </header>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <div className="metric-card"><span className="metric-label">Assigned to you</span><strong>{mine.length}</strong><span className="metric-note">Shipments in your queue</span></div>
        <div className="metric-card"><span className="metric-label">On the road</span><strong>{mine.filter((s) => s.status === 'Out for delivery').length}</strong><span className="metric-note">Currently in transit</span></div>
        <div className="metric-card"><span className="metric-label">Completed</span><strong>{mine.filter((s) => s.status === 'Delivered' || s.status === 'Closed').length}</strong><span className="metric-note">Delivery recorded</span></div>
      </div>

      <div className="section-heading"><div><h2>Shipment queue</h2><p>Proof of delivery is required before a shipment can be completed.</p></div><span className="count-chip">{mine.length} records</span></div>
      <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
        {mine.map((shipment) => {
          const stepIndex = steps.indexOf(shipment.status)
          const busy = busyId === shipment.id
          return (
            <article key={shipment.id} className="work-card">
              <div className="work-card-top">
                <div className="min-w-0"><span className="record-id">{shipment.id}</span><h3>{shipment.customerName}</h3><p>{shipment.trackingNumber || 'Tracking number pending'} · ETA {shipment.eta || 'to be scheduled'}</p></div>
                <StatusPill label={shipment.status} variant={shipment.status === 'Delivered' || shipment.status === 'Closed' ? 'green' : shipment.status === 'Out for delivery' ? 'amber' : 'neutral'} />
              </div>
              <div className="workflow-steps" aria-label={`Shipment progress: ${shipment.status}`}>
                {steps.map((step, index) => <div className={`workflow-step ${index <= stepIndex ? 'is-complete' : ''}`} key={step}><span>{index < stepIndex ? <CheckCircle2 size={14} /> : index + 1}</span><small>{step}</small></div>)}
              </div>
              <div className="work-card-actions">
                {shipment.status === 'Assigned' && <button disabled={busy} onClick={() => startDelivery(shipment)} className="btn-primary"><MapPin size={15} /> {busy ? 'Starting…' : 'Start delivery'}</button>}
                {shipment.status === 'Out for delivery' && !shipment.proof && <button onClick={() => { setProofFor(shipment.id); setProof({ reference: '', notes: '' }) }} className="btn-primary"><ClipboardCheck size={15} /> Record proof</button>}
                {shipment.status === 'Out for delivery' && shipment.proof && <button disabled={busy} onClick={() => completeDelivery(shipment)} className="btn-primary"><PackageCheck size={15} /> {busy ? 'Completing…' : 'Mark delivered'}</button>}
                {(shipment.status === 'Delivered' || shipment.status === 'Closed') && <span className="success-note"><CheckCircle2 size={16} /> Handover recorded</span>}
                {shipment.status === 'Out for delivery' && <span className="subtle-note">{shipment.proof ? 'Proof saved' : 'Proof required'}</span>}
              </div>
              {proofFor === shipment.id && shipment.status === 'Out for delivery' && (
                <form className="proof-form" onSubmit={(event) => submitProof(event, shipment)}>
                  <div className="proof-form-title"><ClipboardCheck size={17} /><div><strong>Proof of delivery</strong><span>Enter a receipt, handover code or delivery note.</span></div></div>
                  <label>Proof reference <span>(recommended)</span><input value={proof.reference} onChange={(event) => setProof((current) => ({ ...current, reference: event.target.value }))} placeholder="e.g. POD-REC-1042" /></label>
                  <label>Delivery notes <span>(required if no reference)</span><textarea value={proof.notes} onChange={(event) => setProof((current) => ({ ...current, notes: event.target.value }))} rows={2} placeholder="Recipient name, handover details or condition of goods" /></label>
                  <div className="flex flex-wrap gap-2"><button type="submit" disabled={busy || (!proof.reference.trim() && !proof.notes.trim())} className="btn-primary"><CheckCircle2 size={15} /> {busy ? 'Saving…' : 'Save proof'}</button><button type="button" className="btn-secondary" onClick={() => setProofFor(null)}>Cancel</button></div>
                </form>
              )}
            </article>
          )
        })}
        {mine.length === 0 && <div className="empty-state xl:col-span-2"><div className="empty-state-icon"><Truck size={22} /></div><h3>Your queue is clear</h3><p>No shipments are assigned to this account yet. The Warehouse Manager or Main Admin can assign one after packing is complete.</p></div>}
      </div>
    </div>
  )
}
