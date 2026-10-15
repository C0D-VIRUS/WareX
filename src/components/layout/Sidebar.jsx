import { NavLink } from 'react-router-dom'
import { X, Boxes } from 'lucide-react'
import { NAV_BY_ROLE } from '../../lib/nav'
import { getRole } from '../../lib/roles'

function SidebarContent({ roleId, onNavigate }) {
  const items = NAV_BY_ROLE[roleId] || []
  const role = getRole(roleId)

  return (
    <>
      <nav className="flex-1 overflow-y-auto py-3 px-2 space-y-0.5">
        {items.map((item) => (
          <NavLink
            key={item.path}
            to={`/${roleId}${item.path ? '/' + item.path : ''}`}
            end={item.end}
            onClick={onNavigate}
            className={({ isActive }) =>
              `flex items-center gap-2.5 px-3 py-2 rounded-md text-sm transition-colors ${isActive ? 'font-medium' : ''}`
            }
            style={({ isActive }) => ({
              color: isActive ? '#fff' : 'var(--ink-muted)',
              background: isActive ? 'var(--ink-raised)' : 'transparent',
              borderLeft: isActive ? '2px solid var(--accent)' : '2px solid transparent',
            })}
          >
            <item.icon size={16} strokeWidth={2} />
            {item.label}
          </NavLink>
        ))}
      </nav>

      <div className="px-4 py-4 text-xs" style={{ borderTop: '1px solid var(--ink-line)', color: 'var(--ink-muted)' }}>
        Signed in as <span style={{ color: '#fff' }}>{role.label}</span>
      </div>
    </>
  )
}

export default function Sidebar({ roleId, mobileOpen, onClose }) {
  return (
    <>
      {/* Desktop sidebar */}
      <aside
        className="hidden md:flex md:flex-col w-64 shrink-0 h-screen sticky top-0"
        style={{ background: 'var(--ink)', borderRight: '1px solid var(--ink-line)' }}
      >
        <div className="px-5 py-5 flex items-baseline gap-2" style={{ borderBottom: '1px solid var(--ink-line)' }}>
          <span className="sidebar-brand-mark"><Boxes size={16} /></span><span className="text-lg font-bold tracking-tight" style={{ color: '#fff' }}>WAREX</span>
          <span className="text-[10px] font-mono-data" style={{ color: 'var(--accent)' }}>v1.0</span>
        </div>
        <SidebarContent roleId={roleId} />
      </aside>

      {/* Mobile drawer */}
      {mobileOpen && (
        <div className="md:hidden fixed inset-0 z-30 flex">
          <div className="absolute inset-0 bg-black/40" onClick={onClose} />
          <aside
            className="relative flex flex-col w-64 h-full"
            style={{ background: 'var(--ink)' }}
          >
            <div
              className="px-5 py-5 flex items-center justify-between"
              style={{ borderBottom: '1px solid var(--ink-line)' }}
            >
              <div className="flex items-baseline gap-2">
                <span className="sidebar-brand-mark"><Boxes size={16} /></span><span className="text-lg font-bold tracking-tight" style={{ color: '#fff' }}>WAREX</span>
                <span className="text-[10px] font-mono-data" style={{ color: 'var(--accent)' }}>v1.0</span>
              </div>
              <button onClick={onClose} aria-label="Close menu" style={{ color: 'var(--ink-muted)' }}>
                <X size={18} />
              </button>
            </div>
            <SidebarContent roleId={roleId} onNavigate={onClose} />
          </aside>
        </div>
      )}
    </>
  )
}
