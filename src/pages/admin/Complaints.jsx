import { useMemo, useState } from 'react'
import { MessageSquareWarning, UserRoundCheck } from 'lucide-react'
import { useWarex } from '../../context/WarexContext'
import StatusPill from '../../components/common/StatusPill'

const FILTERS = [
  'all',
  'Open',
  'Service Assigned',
  'In Progress',
  'Resolved',
  'Closed',
]

export default function Complaints() {
  const { complaints, users, assignTechnician } = useWarex()
  const [filter, setFilter] = useState('all')

  const technicians = useMemo(
    () =>
      users.filter(
        (user) => user.roleId === 'technician' && user.active,
      ),
    [users],
  )

  const rows = useMemo(
    () =>
      complaints.filter(
        (complaint) =>
          filter === 'all' || complaint.status === filter,
      ),
    [complaints, filter],
  )

  const getTechnicianId = (technician) =>
    technician.dbId || technician.id

  const getAssignedTechnician = (complaint) =>
    technicians.find(
      (technician) => technician.email === complaint.assignedTo,
    )

  const getStatusVariant = (status) => {
    if (status === 'Resolved' || status === 'Closed') return 'green'
    if (status === 'Service Assigned' || status === 'In Progress') {
      return 'amber'
    }
    return 'red'
  }

  const canAssign = (status) =>
    status === 'Open' || status === 'Service Assigned'

  return (
    <div>
      <div className="flex items-center gap-2">
        <MessageSquareWarning
          size={18}
          style={{ color: 'var(--accent-dim)' }}
        />
        <h1
          className="text-xl font-semibold"
          style={{ color: 'var(--text)' }}
        >
          Complaints
        </h1>
      </div>

      <p className="mt-1 text-sm" style={{ color: 'var(--muted)' }}>
        Review complaints, assign technicians, and track service visits
        through completion.
      </p>

      <div className="mt-4 flex flex-wrap gap-2">
        {FILTERS.map((item) => (
          <button
            key={item}
            type="button"
            onClick={() => setFilter(item)}
            className="rounded-full px-3 py-1.5 text-xs"
            style={{
              background:
                filter === item ? 'var(--ink)' : 'var(--paper-panel)',
              color: filter === item ? '#fff' : 'var(--text)',
              border: '1px solid var(--paper-line)',
            }}
          >
            {item === 'all' ? 'All' : item}
          </button>
        ))}
      </div>

      <div
        className="mt-4 overflow-hidden rounded-lg"
        style={{
          background: 'var(--paper-panel)',
          border: '1px solid var(--paper-line)',
        }}
      >
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr style={{ borderBottom: '1px solid var(--paper-line)' }}>
                {[
                  'Complaint',
                  'Order',
                  'Issue',
                  'Status',
                  'Technician',
                  'Actions',
                ].map((heading) => (
                  <th
                    key={heading}
                    className="px-4 py-2.5 text-left text-xs font-medium"
                    style={{ color: 'var(--muted)' }}
                  >
                    {heading}
                  </th>
                ))}
              </tr>
            </thead>

            <tbody>
              {rows.map((complaint) => {
                const assignedTechnician =
                  getAssignedTechnician(complaint)

                return (
                  <tr
                    key={complaint.id}
                    style={{ borderBottom: '1px solid var(--paper-line)' }}
                  >
                    <td
                      className="px-4 py-3 font-mono-data text-xs"
                      style={{ color: 'var(--text)' }}
                    >
                      {complaint.id}
                    </td>

                    <td
                      className="px-4 py-3 text-xs"
                      style={{ color: 'var(--muted)' }}
                    >
                      {complaint.orderId || '—'}
                    </td>

                    <td className="px-4 py-3">
                      <div style={{ color: 'var(--text)' }}>
                        {complaint.subject || 'General complaint'}
                      </div>
                      <div
                        className="mt-0.5 text-xs"
                        style={{ color: 'var(--muted)' }}
                      >
                        {complaint.description}
                      </div>
                    </td>

                    <td className="px-4 py-3">
                      <StatusPill
                        label={complaint.status}
                        variant={getStatusVariant(complaint.status)}
                      />
                    </td>

                    <td
                      className="px-4 py-3 text-xs"
                      style={{ color: 'var(--muted)' }}
                    >
                      {complaint.assignedTo || '—'}
                    </td>

                    <td className="px-4 py-3">
                      <div className="flex flex-wrap items-center gap-2">
                        {canAssign(complaint.status) && (
                          <select
                            key={`${complaint.id}-${assignedTechnician?.email || 'unassigned'}`}
                            defaultValue={
                              assignedTechnician
                                ? getTechnicianId(assignedTechnician)
                                : ''
                            }
                            onChange={(event) => {
                              const technicianId = event.target.value

                              if (technicianId) {
                                void assignTechnician(
                                  complaint.id,
                                  technicianId,
                                )
                              }
                            }}
                            className="rounded-md px-2 py-1.5 text-xs outline-none"
                            style={{
                              background: 'var(--paper)',
                              border: '1px solid var(--paper-line)',
                              color: 'var(--text)',
                            }}
                          >
                            <option value="">Assign technician</option>

                            {technicians.map((technician) => (
                              <option
                                key={getTechnicianId(technician)}
                                value={getTechnicianId(technician)}
                              >
                                {technician.name ||
                                  technician.fullName ||
                                  technician.email}
                              </option>
                            ))}
                          </select>
                        )}

                        {canAssign(complaint.status) &&
                          technicians.length === 0 && (
                            <span
                              className="text-xs"
                              style={{ color: 'var(--muted)' }}
                            >
                              No active technicians
                            </span>
                          )}

                        {(complaint.status === 'Resolved' ||
                          complaint.status === 'Closed') && (
                          <span
                            className="inline-flex items-center gap-1.5 text-xs"
                            style={{ color: 'var(--muted)' }}
                          >
                            <UserRoundCheck size={13} />
                            {complaint.status}
                          </span>
                        )}

                        {complaint.status === 'In Progress' && (
                          <span
                            className="text-xs"
                            style={{ color: 'var(--muted)' }}
                          >
                            Service in progress
                          </span>
                        )}

                        {complaint.status === 'Service Assigned' && (
                          <span
                            className="text-xs"
                            style={{ color: 'var(--muted)' }}
                          >
                            Awaiting technician
                          </span>
                        )}
                      </div>
                    </td>
                  </tr>
                )
              })}

              {rows.length === 0 && (
                <tr>
                  <td
                    colSpan={6}
                    className="px-4 py-8 text-center text-sm"
                    style={{ color: 'var(--muted)' }}
                  >
                    No complaints found for this filter.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}