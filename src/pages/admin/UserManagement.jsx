import { useMemo, useState } from 'react'
import { UserCog, Plus, Pencil, Power, Search, X } from 'lucide-react'
import { ROLES } from '../../lib/roles'
import { useWarex } from '../../context/WarexContext'
import StatusPill from '../../components/common/StatusPill'

const ROLE_LABEL = Object.fromEntries(ROLES.map((r) => [r.id, r.label]))

function UserModal({ user, onClose, onSave }) {
  const [form, setForm] = useState(user || { name: '', email: '', password: 'welcome123', roleId: 'business_customer' })
  const [error, setError] = useState('')
  const isEdit = Boolean(user)
  function submit(e) {
    e.preventDefault()
    if (!form.name.trim() || !form.email.trim()) return setError('Name and email are required.')
    if (!isEdit && form.password.length < 6) return setError('Use a password with at least 6 characters.')
    onSave(form)
  }
  return <div className="fixed inset-0 z-40 flex items-center justify-center px-4">
    <div className="absolute inset-0 bg-black/40" onClick={onClose} />
    <form onSubmit={submit} className="relative w-full max-w-md rounded-lg p-5" style={{ background: 'var(--paper-panel)', border: '1px solid var(--paper-line)' }}>
      <div className="flex items-start justify-between"><div><h2 className="text-base font-semibold" style={{ color: 'var(--text)' }}>{isEdit ? 'Edit user' : 'Create user'}</h2><p className="text-xs mt-1" style={{ color: 'var(--muted)' }}>Main Admin controls account access and role.</p></div><button type="button" onClick={onClose}><X size={18} style={{ color: 'var(--muted)' }} /></button></div>
      <div className="mt-4 space-y-3">
        <div><label className="text-xs font-medium" style={{ color: 'var(--text)' }}>Name</label><input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} className="mt-1 w-full px-3 py-2 text-sm rounded-md outline-none" style={{ background: 'var(--paper)', border: '1px solid var(--paper-line)', color: 'var(--text)' }} /></div>
        <div><label className="text-xs font-medium" style={{ color: 'var(--text)' }}>Email</label><input type="email" value={form.email} disabled={isEdit} onChange={(e) => setForm({ ...form, email: e.target.value })} className="mt-1 w-full px-3 py-2 text-sm rounded-md outline-none disabled:opacity-60" style={{ background: 'var(--paper)', border: '1px solid var(--paper-line)', color: 'var(--text)' }} /></div>
        {!isEdit && <div><label className="text-xs font-medium" style={{ color: 'var(--text)' }}>Initial password</label><input value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} className="mt-1 w-full px-3 py-2 text-sm rounded-md outline-none font-mono-data" style={{ background: 'var(--paper)', border: '1px solid var(--paper-line)', color: 'var(--text)' }} /></div>}
        <div><label className="text-xs font-medium" style={{ color: 'var(--text)' }}>Role</label><select value={form.roleId} onChange={(e) => setForm({ ...form, roleId: e.target.value })} className="mt-1 w-full px-3 py-2 text-sm rounded-md outline-none" style={{ background: 'var(--paper)', border: '1px solid var(--paper-line)', color: 'var(--text)' }}>{ROLES.map((r) => <option key={r.id} value={r.id}>{r.label}</option>)}</select></div>
        {error && <div className="text-xs" style={{ color: 'var(--signal-red)' }}>{error}</div>}
      </div>
      <div className="mt-5 flex gap-2"><button type="button" onClick={onClose} className="flex-1 py-2 text-sm rounded-md" style={{ border: '1px solid var(--paper-line)', color: 'var(--text)' }}>Cancel</button><button className="flex-1 py-2 text-sm rounded-md font-medium" style={{ background: 'var(--accent)', color: 'var(--accent-ink)' }}>{isEdit ? 'Save changes' : 'Create account'}</button></div>
    </form>
  </div>
}

export default function UserManagement() {
  const { users, createUser, updateUser, toggleUser, session } = useWarex()
  const [modal, setModal] = useState(null)
  const [query, setQuery] = useState('')
  const filtered = useMemo(() => users.filter((u) => `${u.name} ${u.email} ${ROLE_LABEL[u.roleId]}`.toLowerCase().includes(query.toLowerCase())), [users, query])

  function save(form) {
    if (modal === 'new') createUser(form)
    else updateUser(modal.id, { name: form.name, roleId: form.roleId })
    setModal(null)
  }

  return <div>
    <div className="flex items-center justify-between gap-3 flex-wrap"><div><div className="flex items-center gap-2"><UserCog size={18} style={{ color: 'var(--accent-dim)' }} /><h1 className="text-xl font-semibold" style={{ color: 'var(--text)' }}>User & Role Management</h1></div><p className="mt-1 text-sm" style={{ color: 'var(--muted)' }}>Main Admin creates accounts and assigns the role that controls each user's WAREX workspace.</p></div><button onClick={() => setModal('new')} className="inline-flex items-center gap-1.5 px-3 py-2 text-sm font-medium rounded-md" style={{ background: 'var(--accent)', color: 'var(--accent-ink)' }}><Plus size={15} /> Create user</button></div>

    <div className="mt-4 grid grid-cols-2 lg:grid-cols-4 gap-3">
      {ROLES.slice(0, 4).map((role) => <div key={role.id} className="rounded-lg p-3" style={{ background: 'var(--paper-panel)', border: '1px solid var(--paper-line)' }}><div className="text-xs" style={{ color: 'var(--muted)' }}>{role.label}</div><div className="mt-1 text-xl font-semibold font-mono-data" style={{ color: 'var(--text)' }}>{users.filter((u) => u.roleId === role.id).length}</div></div>)}
    </div>

    <div className="mt-5 relative max-w-md"><Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2" style={{ color: 'var(--muted)' }} /><input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search users, email or role…" className="w-full pl-9 pr-3 py-2 text-sm rounded-md outline-none" style={{ background: 'var(--paper-panel)', border: '1px solid var(--paper-line)', color: 'var(--text)' }} /></div>

    <div className="mt-4 rounded-lg overflow-hidden" style={{ background: 'var(--paper-panel)', border: '1px solid var(--paper-line)' }}><div className="overflow-x-auto"><table className="w-full text-sm"><thead><tr style={{ borderBottom: '1px solid var(--paper-line)' }}>{['User','Email','Role','Status','Created','Actions'].map((h) => <th key={h} className="text-left px-4 py-2.5 text-xs font-medium" style={{ color: 'var(--muted)' }}>{h}</th>)}</tr></thead><tbody>
      {filtered.map((u) => <tr key={u.id} style={{ borderBottom: '1px solid var(--paper-line)' }}><td className="px-4 py-3"><div className="font-medium" style={{ color: 'var(--text)' }}>{u.name}{u.id === session.userId && <span className="ml-2 text-[10px]" style={{ color: 'var(--accent-dim)' }}>YOU</span>}</div><div className="text-[11px] font-mono-data" style={{ color: 'var(--muted)' }}>{u.id}</div></td><td className="px-4 py-3" style={{ color: 'var(--muted)' }}>{u.email}</td><td className="px-4 py-3"><StatusPill label={ROLE_LABEL[u.roleId]} variant="neutral" /></td><td className="px-4 py-3"><StatusPill label={u.active ? 'Active' : 'Inactive'} variant={u.active ? 'green' : 'red'} /></td><td className="px-4 py-3 text-xs" style={{ color: 'var(--muted)' }}>{u.createdAt}</td><td className="px-4 py-3"><div className="flex items-center gap-2"><button onClick={() => setModal(u)} className="inline-flex items-center gap-1.5 px-2.5 py-1.5 text-xs rounded-md" style={{ border: '1px solid var(--paper-line)', color: 'var(--text)' }}><Pencil size={12} /> Edit</button>{u.id !== session.userId && <button onClick={() => toggleUser(u.id)} className="inline-flex items-center gap-1.5 px-2.5 py-1.5 text-xs rounded-md" style={{ border: '1px solid var(--paper-line)', color: u.active ? 'var(--signal-red)' : 'var(--signal-green)' }}><Power size={12} /> {u.active ? 'Disable' : 'Enable'}</button>}</div></td></tr>)}
    </tbody></table></div></div>
    {modal && <UserModal user={modal === 'new' ? null : modal} onClose={() => setModal(null)} onSave={save} />}
  </div>
}
