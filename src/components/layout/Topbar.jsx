import { useMemo, useState } from 'react'
import { Search, Bell, ChevronDown, LogOut, Menu, Check, ArrowUpRight } from 'lucide-react'
import { getRole } from '../../lib/roles'
import { useWarex } from '../../context/WarexContext'
import { useNavigate } from 'react-router-dom'

export default function Topbar({ session, onMenuClick }) {
  const { users, notifications, markNotificationRead, logout } = useWarex()
  const [menuOpen, setMenuOpen] = useState(false)
  const [notificationOpen, setNotificationOpen] = useState(false)
  const [query, setQuery] = useState('')
  const role = getRole(session.roleId)
  const unread = notifications.filter((n) => !n.read && (!n.target || n.target === session.roleId) && (!n.targetEmail || n.targetEmail === session.email))
  const matches = useMemo(() => {
    if (!query.trim()) return []
    const q = query.toLowerCase()
    return [
      ...users.filter((u) => `${u.name} ${u.email} ${u.roleId}`.toLowerCase().includes(q)).map((u) => ({ type: 'User', label: u.name, sub: u.email, path: `/${u.roleId}` })),
    ].slice(0, 5)
  }, [query, users])
  const navigate = useNavigate()

  function signOut() {
    setMenuOpen(false)
    logout()
  }

  return (
    <header className="sticky top-0 z-20 flex items-center gap-3 px-4 md:px-6 py-3" style={{ background: 'var(--paper-panel)', borderBottom: '1px solid var(--paper-line)' }}>
      <button className="md:hidden" onClick={onMenuClick} aria-label="Open menu" style={{ color: 'var(--text)' }}><Menu size={20} /></button>
      <div className="flex-1 max-w-lg relative">
        <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2" style={{ color: 'var(--muted)' }} />
        <input value={query} onChange={(e) => setQuery(e.target.value)} type="text" placeholder="Search users, SKUs, orders…" className="w-full pl-9 pr-3 py-2 text-sm rounded-md outline-none" style={{ background: 'var(--paper)', border: '1px solid var(--paper-line)', color: 'var(--text)' }} />
        {matches.length > 0 && (
          <div className="absolute left-0 right-0 mt-1 rounded-md overflow-hidden shadow-lg" style={{ background: 'var(--paper-panel)', border: '1px solid var(--paper-line)' }}>
            {matches.map((m) => <button key={m.label} onClick={() => { navigate(m.path); setQuery('') }} className="w-full text-left px-3 py-2.5 hover:opacity-80" style={{ borderBottom: '1px solid var(--paper-line)' }}><div className="text-xs font-medium" style={{ color: 'var(--text)' }}>{m.label}</div><div className="text-[11px]" style={{ color: 'var(--muted)' }}>{m.type} · {m.sub}</div></button>)}
          </div>
        )}
      </div>
      <div className="flex-1" />

      <div className="relative">
        <button onClick={() => setNotificationOpen((v) => !v)} className="relative p-2 rounded-md" style={{ color: 'var(--muted)' }} aria-label="Notifications">
          <Bell size={18} />
          {unread.length > 0 && <span className="absolute -right-0.5 -top-0.5 min-w-4 h-4 px-1 rounded-full text-[9px] flex items-center justify-center font-semibold" style={{ background: 'var(--accent)', color: '#fff' }}>{Math.min(9, unread.length)}</span>}
        </button>
        {notificationOpen && (
          <div className="absolute right-0 mt-1 w-80 rounded-lg overflow-hidden shadow-lg" style={{ background: 'var(--paper-panel)', border: '1px solid var(--paper-line)' }}>
            <div className="px-3 py-2.5 flex items-center justify-between" style={{ borderBottom: '1px solid var(--paper-line)' }}><span className="text-sm font-medium" style={{ color: 'var(--text)' }}>Notifications</span><span className="text-xs" style={{ color: 'var(--muted)' }}>{unread.length} unread</span></div>
            <div className="max-h-80 overflow-auto">
              {unread.length === 0 && <div className="p-6 text-center text-xs" style={{ color: 'var(--muted)' }}>You're all caught up.</div>}
              {unread.map((n) => <button key={n.id} onClick={() => markNotificationRead(n.id)} className="w-full text-left px-3 py-3 hover:opacity-80" style={{ borderBottom: '1px solid var(--paper-line)' }}><div className="text-xs leading-relaxed" style={{ color: 'var(--text)' }}>{n.message}</div><div className="mt-1 text-[10px]" style={{ color: 'var(--muted)' }}>{n.createdAt} · click to mark read</div></button>)}
            </div>
          </div>
        )}
      </div>

      <div className="relative">
        <button onClick={() => setMenuOpen((v) => !v)} className="flex items-center gap-2 pl-2 pr-1 py-1 rounded-md" style={{ border: '1px solid var(--paper-line)' }}>
          <div className="w-7 h-7 rounded-full flex items-center justify-center text-xs font-semibold" style={{ background: 'var(--ink)', color: '#fff' }}>{session.name?.[0]?.toUpperCase() || role.label[0]}</div>
          <span className="hidden sm:block text-sm" style={{ color: 'var(--text)' }}>{role.label}</span><ChevronDown size={14} style={{ color: 'var(--muted)' }} />
        </button>
        {menuOpen && (
          <div className="absolute right-0 mt-1 w-56 rounded-md overflow-hidden shadow-lg" style={{ background: 'var(--paper-panel)', border: '1px solid var(--paper-line)' }}>
            <div className="px-3 py-2.5" style={{ borderBottom: '1px solid var(--paper-line)' }}><div className="text-xs font-medium" style={{ color: 'var(--text)' }}>{session.name}</div><div className="text-[11px] mt-0.5 truncate" style={{ color: 'var(--muted)' }}>{session.email}</div></div>
            <div className="px-3 py-2 text-[11px] flex items-center gap-1.5" style={{ color: 'var(--muted)' }}><Check size={12} style={{ color: 'var(--signal-green)' }} /> Role assigned by Main Admin</div>
            <button onClick={signOut} className="w-full flex items-center gap-2 px-3 py-2.5 text-sm hover:opacity-80" style={{ color: 'var(--signal-red)' }}><LogOut size={14} /> Sign out</button>
            <div className="px-3 py-2 text-[10px] flex items-center gap-1" style={{ color: 'var(--muted)', borderTop: '1px solid var(--paper-line)' }}>Frontend prototype <ArrowUpRight size={11} /></div>
          </div>
        )}
      </div>
    </header>
  )
}
