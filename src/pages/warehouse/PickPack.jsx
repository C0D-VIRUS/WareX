
import { useState } from 'react'
import {
  PackageCheck,
  CheckCircle2,
  Package,
  Boxes,
  Truck,
  Ruler,
  Weight,
  Route,
  X,
} from 'lucide-react'

import StatusPill from '../../components/common/StatusPill'
import { useWarex } from '../../context/WarexContext'

const statusMeta = {
  Placed: ['Placed', 'amber'],
  Confirmed: ['Confirmed', 'amber'],
  Reserved: ['Stock Reserved', 'green'],
  Picked: ['Picked', 'neutral'],
  Packed: ['Packed', 'green'],
  'Shipment Created': ['Shipment Created', 'amber'],
  Delayed: ['Delayed', 'red'],
  Processed: ['Processed', 'green'],
  Shipped: ['Shipped', 'green'],
}

const initialMeasurements = {
  packageWeightKg: '',
  packageLengthCm: '',
  packageWidthCm: '',
  packageHeightCm: '',
  estimatedDistanceKm: '',
}

const measurementFields = [
  {
    name: 'packageWeightKg',
    label: 'Package weight',
    unit: 'kg',
    min: '0.01',
    step: '0.01',
  },
  {
    name: 'packageLengthCm',
    label: 'Length',
    unit: 'cm',
    min: '0.1',
    step: '0.1',
  },
  {
    name: 'packageWidthCm',
    label: 'Width',
    unit: 'cm',
    min: '0.1',
    step: '0.1',
  },
  {
    name: 'packageHeightCm',
    label: 'Height',
    unit: 'cm',
    min: '0.1',
    step: '0.1',
  },
  {
    name: 'estimatedDistanceKm',
    label: 'Delivery distance',
    unit: 'km',
    min: '0.1',
    step: '0.1',
  },
]

export default function PickPack() {
  const {
    orders,
    reserveStock,
    pickPackOrder,
    createShipment,
    shipments,
  } = useWarex()

  const [formOrderId, setFormOrderId] = useState(null)
  const [measurements, setMeasurements] = useState(initialMeasurements)
  const [formError, setFormError] = useState('')
  const [submittingOrderId, setSubmittingOrderId] = useState(null)

  const open = orders.filter(
    (order) => !['Delivered', 'Closed', 'DELIVERED', 'CLOSED'].includes(order.status)
  )

  function openShipmentForm(orderId) {
    setFormOrderId(orderId)
    setMeasurements(initialMeasurements)
    setFormError('')
  }

  function closeShipmentForm() {
    setFormOrderId(null)
    setMeasurements(initialMeasurements)
    setFormError('')
  }

  function handleMeasurementChange(event) {
    const { name, value } = event.target

    setMeasurements((current) => ({
      ...current,
      [name]: value,
    }))

    setFormError('')
  }

  async function handleCreateShipment(event, orderId) {
    event.preventDefault()
    setFormError('')

    const payload = {}

    for (const field of measurementFields) {
      const value = Number(measurements[field.name])

      if (
        measurements[field.name] === '' ||
        !Number.isFinite(value) ||
        value <= 0
      ) {
        setFormError(
          `${field.label} must be a number greater than zero.`
        )
        return
      }

      payload[field.name] = value
    }

    setSubmittingOrderId(orderId)

    try {
      // The shared context must forward this payload to the backend.
      const result = await createShipment(orderId, payload)

      if (result) {
        closeShipmentForm()
      } else {
        setFormError(
          'Shipment could not be created. Check the notification message and try again.'
        )
      }
    } catch (error) {
      setFormError(error.message || 'Shipment creation failed.')
    } finally {
      setSubmittingOrderId(null)
    }
  }

  return (
    <div>
      <div className="flex items-center gap-2">
        <PackageCheck
          size={18}
          style={{ color: 'var(--accent-dim)' }}
        />
        <h1
          className="text-xl font-semibold"
          style={{ color: 'var(--text)' }}
        >
          Pick & Pack
        </h1>
      </div>

      <p
        className="mt-1 text-sm"
        style={{ color: 'var(--muted)' }}
      >
        Follow the WAREX sequence: validate → reserve → pick → pack
        → measure package → select vehicle → create shipment.
      </p>

      <div className="mt-5 space-y-3">
        {open.map((order) => {
          const meta = statusMeta[order.status] || [
            order.status,
            'neutral',
          ]

          const shipment = shipments.find(
            (item) =>
              item.id === order.shipmentId ||
              item.orderId === order.id ||
              item.orderId === order.dbId
          )

          const totalUnits = (order.items || []).reduce(
            (sum, item) => sum + Number(item.qty || 0),
            0
          )

          const formOpen = formOrderId === order.id
          const submitting = submittingOrderId === order.id

          return (
            <div
              key={order.id}
              className="rounded-lg p-4"
              style={{
                background: 'var(--paper-panel)',
                border: '1px solid var(--paper-line)',
              }}
            >
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <div className="flex items-center gap-2">
                    <span
                      className="font-mono-data text-xs"
                      style={{ color: 'var(--text)' }}
                    >
                      {order.id}
                    </span>

                    <StatusPill
                      label={meta[0]}
                      variant={meta[1]}
                    />
                  </div>

                  <div
                    className="mt-1 text-sm"
                    style={{ color: 'var(--muted)' }}
                  >
                    {order.customerName} · {totalUnits} units
                  </div>
                </div>

                <div className="flex flex-wrap gap-2">
                  {['Placed', 'Confirmed', 'Delayed'].includes(
                    order.status
                  ) && (
                    <button
                      type="button"
                      onClick={() => reserveStock(order.id)}
                      className="inline-flex items-center gap-1.5 px-2.5 py-1.5 text-xs rounded-md"
                      style={{
                        background: 'var(--ink)',
                        color: '#fff',
                      }}
                    >
                      <Boxes size={12} />
                      Check & reserve
                    </button>
                  )}

                  {order.status === 'Reserved' && (
                    <button
                      type="button"
                      onClick={() => pickPackOrder(order.id, 'pick')}
                      className="inline-flex items-center gap-1.5 px-2.5 py-1.5 text-xs rounded-md"
                      style={{
                        background: 'var(--ink)',
                        color: '#fff',
                      }}
                    >
                      <Package size={12} />
                      Pick
                    </button>
                  )}

                  {order.status === 'Picked' && (
                    <button
                      type="button"
                      onClick={() => pickPackOrder(order.id, 'pack')}
                      className="inline-flex items-center gap-1.5 px-2.5 py-1.5 text-xs rounded-md"
                      style={{
                        background: 'var(--ink)',
                        color: '#fff',
                      }}
                    >
                      <CheckCircle2 size={12} />
                      Pack
                    </button>
                  )}

                  {order.status === 'Packed' && !shipment && (
                    <button
                      type="button"
                      onClick={() =>
                        formOpen
                          ? closeShipmentForm()
                          : openShipmentForm(order.id)
                      }
                      className="inline-flex items-center gap-1.5 px-2.5 py-1.5 text-xs rounded-md"
                      style={{
                        background: 'var(--accent)',
                        color: '#fff',
                      }}
                    >
                      {formOpen ? <X size={12} /> : <Truck size={12} />}
                      {formOpen ? 'Cancel' : 'Create shipment'}
                    </button>
                  )}
                </div>
              </div>

              {formOpen && (
                <form
                  onSubmit={(event) =>
                    handleCreateShipment(event, order.id)
                  }
                  className="mt-4 rounded-lg p-4"
                  style={{
                    background: 'var(--paper)',
                    border: '1px solid var(--paper-line)',
                  }}
                >
                  <div className="flex items-center gap-2">
                    <Truck
                      size={16}
                      style={{ color: 'var(--accent-dim)' }}
                    />
                    <h2
                      className="text-sm font-semibold"
                      style={{ color: 'var(--text)' }}
                    >
                      Package & delivery details
                    </h2>
                  </div>

                  <p
                    className="mt-1 text-xs"
                    style={{ color: 'var(--muted)' }}
                  >
                    Enter the packed shipment measurements so WAREX
                    can check which available vehicle is suitable.
                  </p>

                  <div className="mt-4 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                    {measurementFields.map((field) => {
                      const isWeight =
                        field.name === 'packageWeightKg'
                      const isDistance =
                        field.name === 'estimatedDistanceKm'

                      return (
                        <label
                          key={field.name}
                          className="block"
                        >
                          <span
                            className="flex items-center gap-1.5 text-xs font-medium mb-1.5"
                            style={{ color: 'var(--text)' }}
                          >
                            {isWeight ? (
                              <Weight size={13} />
                            ) : isDistance ? (
                              <Route size={13} />
                            ) : (
                              <Ruler size={13} />
                            )}

                            {field.label} ({field.unit})
                          </span>

                          <input
                            type="number"
                            name={field.name}
                            min={field.min}
                            step={field.step}
                            value={measurements[field.name]}
                            onChange={handleMeasurementChange}
                            placeholder={`Enter ${field.unit}`}
                            required
                            disabled={submitting}
                            className="w-full rounded-md px-3 py-2 text-sm outline-none disabled:opacity-60"
                            style={{
                              color: 'var(--text)',
                              background: 'var(--paper-panel)',
                              border: '1px solid var(--paper-line)',
                            }}
                          />
                        </label>
                      )
                    })}
                  </div>

                  {formError && (
                    <div
                      role="alert"
                      className="mt-3 rounded-md px-3 py-2 text-xs"
                      style={{
                        color: 'var(--signal-red)',
                        border: '1px solid var(--signal-red)',
                      }}
                    >
                      {formError}
                    </div>
                  )}

                  <div className="mt-4 flex flex-wrap gap-2">
                    <button
                      type="submit"
                      disabled={submitting}
                      className="inline-flex items-center gap-2 px-3 py-2 rounded-md text-xs font-medium disabled:opacity-60"
                      style={{
                        background: 'var(--accent)',
                        color: '#fff',
                      }}
                    >
                      <Truck size={14} />
                      {submitting
                        ? 'Selecting vehicle…'
                        : 'Find vehicle & create shipment'}
                    </button>

                    <button
                      type="button"
                      disabled={submitting}
                      onClick={closeShipmentForm}
                      className="px-3 py-2 rounded-md text-xs disabled:opacity-60"
                      style={{
                        color: 'var(--text)',
                        border: '1px solid var(--paper-line)',
                      }}
                    >
                      Cancel
                    </button>
                  </div>
                </form>
              )}

              {shipment && (
                <div
                  className="mt-3 rounded-md px-3 py-2.5 text-xs"
                  style={{
                    background: 'var(--paper)',
                    border: '1px solid var(--paper-line)',
                    color: 'var(--muted)',
                  }}
                >
                  Shipment created:{' '}
                  <span
                    className="font-mono-data"
                    style={{ color: 'var(--text)' }}
                  >
                    {shipment.shipmentNumber || shipment.id}
                  </span>

                  {shipment.deliveryRun?.vehicle && (
                    <div className="mt-1">
                      Selected vehicle:{' '}
                      {shipment.deliveryRun.vehicle.vehicleType}
                      {' · '}
                      {shipment.deliveryRun.vehicle.registrationNo}
                    </div>
                  )}
                </div>
              )}
            </div>
          )
        })}

        {open.length === 0 && (
          <div
            className="rounded-lg p-8 text-center"
            style={{
              background: 'var(--paper-panel)',
              border: '1px dashed var(--paper-line)',
            }}
          >
            <p
              className="text-sm"
              style={{ color: 'var(--muted)' }}
            >
              No open orders.
            </p>
          </div>
        )}
      </div>
    </div>
  )
}
