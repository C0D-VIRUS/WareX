
import { useState } from 'react'
import {
  Wrench,
  CheckCircle2,
  PackageCheck,
  AlertTriangle,
  FileText,
  LoaderCircle,
  ClipboardCheck,
} from 'lucide-react'

import StatusPill from '../../components/common/StatusPill'
import { useWarex } from '../../context/WarexContext'

const statusMeta = {
  Assigned: ['Assigned', 'amber'],
  'Visit Accepted': ['Visit Accepted', 'amber'],
  Inspected: ['Inspected', 'neutral'],
  'Assembly Completed': ['Assembly Completed', 'green'],
  'Defect Found': ['Defect Found', 'red'],
  'Repair Completed': ['Repair Completed', 'green'],
  Completed: ['Completed', 'green'],
}

export default function ServiceVisits({ session }) {
  const { serviceVisits, updateService } = useWarex()

  const mine = serviceVisits.filter(
    (visit) =>
      visit.technicianEmail?.toLowerCase() ===
      session.email?.toLowerCase()
  )

  const [reporting, setReporting] = useState(null)
  const [report, setReport] = useState('')
  const [busyVisitId, setBusyVisitId] = useState(null)
  const [reportError, setReportError] = useState('')

  async function performAction(visit, changes) {
    if (busyVisitId) return

    setBusyVisitId(visit.id)

    try {
      await updateService(visit.id, changes)
    } finally {
      setBusyVisitId(null)
    }
  }

  function openReport(visit) {
    setReporting(visit)
    setReport(visit.report || '')
    setReportError('')
  }

  async function saveReport() {
    if (!report.trim()) {
      setReportError('Please enter the service report before submitting.')
      return
    }

    if (!reporting || busyVisitId) return

    setReportError('')
    setBusyVisitId(reporting.id)

    try {
      const saved = await updateService(reporting.id, {
        status: 'Completed',
        report: report.trim(),
      })

      if (saved) {
        setReporting(null)
        setReport('')
      } else {
        setReportError(
          'The visit could not be completed. Check the error notification and finish any remaining work.'
        )
      }
    } catch (error) {
      setReportError(
        error.message || 'Unable to submit the service report.'
      )
    } finally {
      setBusyVisitId(null)
    }
  }

  return (
    <div>
      <div className="flex items-center gap-2">
        <Wrench
          size={18}
          style={{ color: 'var(--accent-dim)' }}
        />
        <h1
          className="text-xl font-semibold"
          style={{ color: 'var(--text)' }}
        >
          Service Visits
        </h1>
      </div>

      <p
        className="mt-1 text-sm"
        style={{ color: 'var(--muted)' }}
      >
        Accept assigned visits, inspect products, complete required
        assembly or repairs, and submit a service report.
      </p>

      <div className="mt-5 space-y-3">
        {mine.map((visit) => {
          const meta = statusMeta[visit.status] || [
            visit.status,
            'neutral',
          ]

          const busy = busyVisitId === visit.id
          const assemblyPending = Boolean(visit.assemblyRequired)
          const defectPending = Boolean(visit.defectFound)

          const canInspect = visit.status === 'Visit Accepted'

          const canAssemble =
            assemblyPending &&
            [
              'Inspected',
              'Repair Completed',
            ].includes(visit.status)

          const canMarkDefect =
            !defectPending &&
            [
              'Inspected',
              'Assembly Completed',
            ].includes(visit.status)

          const canRepair = visit.status === 'Defect Found'

          const canReport =
            !assemblyPending &&
            !defectPending &&
            [
              'Inspected',
              'Assembly Completed',
              'Repair Completed',
            ].includes(visit.status)

          const completeWork =
            visit.status === 'Completed'

          return (
            <div
              key={visit.id}
              className="rounded-lg p-4"
              style={{
                background: 'var(--paper-panel)',
                border: '1px solid var(--paper-line)',
              }}
            >
              <div className="flex items-start justify-between gap-3">
                <div>
                  <div
                    className="font-mono-data text-xs"
                    style={{ color: 'var(--muted)' }}
                  >
                    {visit.id} · {visit.orderId || 'No linked order'}
                  </div>

                  <div
                    className="mt-1 font-medium"
                    style={{ color: 'var(--text)' }}
                  >
                    {visit.customerName}
                  </div>

                  <div
                    className="mt-1 text-xs"
                    style={{ color: 'var(--muted)' }}
                  >
                    Complaint: {visit.complaintId || 'Not provided'}
                  </div>
                </div>

                <StatusPill
                  label={meta[0]}
                  variant={meta[1]}
                />
              </div>

              {(assemblyPending || defectPending) && (
                <div
                  className="mt-3 rounded-md px-3 py-2 text-xs"
                  style={{
                    color: 'var(--muted)',
                    background: 'var(--paper)',
                    border: '1px solid var(--paper-line)',
                  }}
                >
                  <div className="flex items-center gap-2">
                    <ClipboardCheck size={14} />
                    <span className="font-medium">
                      Outstanding work
                    </span>
                  </div>

                  {assemblyPending && (
                    <p className="mt-1">
                      Product assembly must be completed.
                    </p>
                  )}

                  {defectPending && (
                    <p className="mt-1">
                      A product defect requires repair.
                    </p>
                  )}
                </div>
              )}

              {completeWork && visit.report && (
                <div
                  className="mt-3 rounded-md px-3 py-2"
                  style={{
                    background: 'var(--paper)',
                    border: '1px solid var(--paper-line)',
                  }}
                >
                  <div
                    className="text-xs font-medium"
                    style={{ color: 'var(--text)' }}
                  >
                    Submitted service report
                  </div>

                  <p
                    className="mt-1 text-xs whitespace-pre-wrap"
                    style={{ color: 'var(--muted)' }}
                  >
                    {visit.report}
                  </p>
                </div>
              )}

              <div className="mt-4 flex flex-wrap gap-2">
                {visit.status === 'Assigned' && (
                  <button
                    type="button"
                    disabled={busy || Boolean(busyVisitId)}
                    onClick={() =>
                      performAction(visit, {
                        status: 'Visit Accepted',
                      })
                    }
                    className="inline-flex items-center gap-1.5 px-3 py-2 text-xs rounded-md disabled:opacity-60"
                    style={{
                      background: 'var(--ink)',
                      color: '#fff',
                    }}
                  >
                    {busy ? (
                      <LoaderCircle size={13} className="animate-spin" />
                    ) : (
                      <CheckCircle2 size={13} />
                    )}
                    Accept visit
                  </button>
                )}

                {canInspect && (
                  <button
                    type="button"
                    disabled={busy || Boolean(busyVisitId)}
                    onClick={() =>
                      performAction(visit, {
                        status: 'Inspected',
                      })
                    }
                    className="inline-flex items-center gap-1.5 px-3 py-2 text-xs rounded-md disabled:opacity-60"
                    style={{
                      background: 'var(--ink)',
                      color: '#fff',
                    }}
                  >
                    <PackageCheck size={13} />
                    Record inspection
                  </button>
                )}

                {canAssemble && (
                  <button
                    type="button"
                    disabled={busy || Boolean(busyVisitId)}
                    onClick={() =>
                      performAction(visit, {
                        status: 'Assembly Completed',
                        assemblyRequired: false,
                      })
                    }
                    className="inline-flex items-center gap-1.5 px-3 py-2 text-xs rounded-md disabled:opacity-60"
                    style={{
                      background: 'var(--accent)',
                      color: '#fff',
                    }}
                  >
                    <Wrench size={13} />
                    Complete assembly
                  </button>
                )}

                {canMarkDefect && (
                  <button
                    type="button"
                    disabled={busy || Boolean(busyVisitId)}
                    onClick={() =>
                      performAction(visit, {
                        status: 'Defect Found',
                        defectFound: true,
                      })
                    }
                    className="inline-flex items-center gap-1.5 px-3 py-2 text-xs rounded-md disabled:opacity-60"
                    style={{
                      border: '1px solid var(--paper-line)',
                      color: 'var(--signal-red)',
                    }}
                  >
                    <AlertTriangle size={13} />
                    Record defect
                  </button>
                )}

                {canRepair && (
                  <button
                    type="button"
                    disabled={busy || Boolean(busyVisitId)}
                    onClick={() =>
                      performAction(visit, {
                        status: 'Repair Completed',
                        defectFound: false,
                      })
                    }
                    className="inline-flex items-center gap-1.5 px-3 py-2 text-xs rounded-md disabled:opacity-60"
                    style={{
                      background: 'var(--ink)',
                      color: '#fff',
                    }}
                  >
                    <Wrench size={13} />
                    Complete repair
                  </button>
                )}

                {canReport && (
                  <button
                    type="button"
                    disabled={busy || Boolean(busyVisitId)}
                    onClick={() => openReport(visit)}
                    className="inline-flex items-center gap-1.5 px-3 py-2 text-xs rounded-md disabled:opacity-60"
                    style={{
                      border: '1px solid var(--paper-line)',
                      color: 'var(--text)',
                    }}
                  >
                    <FileText size={13} />
                    Submit service report
                  </button>
                )}

                {busy && (
                  <span
                    className="inline-flex items-center gap-1.5 text-xs"
                    style={{ color: 'var(--muted)' }}
                  >
                    <LoaderCircle
                      size={13}
                      className="animate-spin"
                    />
                    Saving…
                  </span>
                )}
              </div>
            </div>
          )
        })}

        {mine.length === 0 && (
          <div
            className="rounded-lg p-10 text-center"
            style={{
              background: 'var(--paper-panel)',
              border: '1px dashed var(--paper-line)',
            }}
          >
            <p
              className="text-sm"
              style={{ color: 'var(--muted)' }}
            >
              No service visits are assigned to this account.
            </p>
          </div>
        )}
      </div>

      {reporting && (
        <div className="fixed inset-0 z-40 flex items-center justify-center px-4">
          <button
            type="button"
            aria-label="Close service report"
            className="absolute inset-0 bg-black/40 cursor-default"
            onClick={() => {
              if (!busyVisitId) {
                setReporting(null)
                setReportError('')
              }
            }}
          />

          <div
            className="relative w-full max-w-md rounded-lg p-5"
            style={{
              background: 'var(--paper-panel)',
              border: '1px solid var(--paper-line)',
            }}
          >
            <h2
              className="text-base font-semibold"
              style={{ color: 'var(--text)' }}
            >
              Submit service report
            </h2>

            <p
              className="text-xs mt-1"
              style={{ color: 'var(--muted)' }}
            >
              {reporting.id} · {reporting.customerName}
            </p>

            <p
              className="text-xs mt-3"
              style={{ color: 'var(--muted)' }}
            >
              Describe the inspection findings, assembly or repair
              performed, and final outcome. Submitting this report
              requests completion of the service visit.
            </p>

            <textarea
              value={report}
              onChange={(event) => {
                setReport(event.target.value)
                setReportError('')
              }}
              rows={5}
              disabled={Boolean(busyVisitId)}
              className="mt-4 w-full px-3 py-2 text-sm rounded-md outline-none resize-none disabled:opacity-60"
              style={{
                background: 'var(--paper)',
                border: '1px solid var(--paper-line)',
                color: 'var(--text)',
              }}
              placeholder="Describe inspection, assembly/repair completed, and final status…"
            />

            {reportError && (
              <p
                role="alert"
                className="mt-2 text-xs"
                style={{ color: 'var(--signal-red)' }}
              >
                {reportError}
              </p>
            )}

            <div className="mt-4 flex gap-2">
              <button
                type="button"
                disabled={Boolean(busyVisitId)}
                onClick={() => {
                  setReporting(null)
                  setReportError('')
                }}
                className="flex-1 py-2 text-sm rounded-md disabled:opacity-60"
                style={{
                  border: '1px solid var(--paper-line)',
                  color: 'var(--text)',
                }}
              >
                Cancel
              </button>

              <button
                type="button"
                disabled={Boolean(busyVisitId) || !report.trim()}
                onClick={saveReport}
                className="flex-1 inline-flex items-center justify-center gap-2 py-2 text-sm rounded-md disabled:opacity-60"
                style={{
                  background: 'var(--accent)',
                  color: '#fff',
                }}
              >
                {busyVisitId === reporting.id && (
                  <LoaderCircle
                    size={14}
                    className="animate-spin"
                  />
                )}
                Submit report
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
