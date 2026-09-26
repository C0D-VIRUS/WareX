import { useMemo, useState } from 'react'
import { ArrowRight, Eye, EyeOff, ShieldCheck } from 'lucide-react'
import { useWarex } from '../../context/WarexContext'

function RackMotif() {
  const rows = 5
  const cols = 8
  const filled = new Set(['0-1','0-2','0-5','1-0','1-3','1-4','1-6','2-2','2-3','2-7','3-1','3-4','3-5','4-0','4-2','4-6','4-7','2-0','0-7','3-7'])
  return (
    <svg viewBox="0 0 320 200" className="w-full max-w-xs" aria-hidden="true">
      {Array.from({ length: rows }).map((_, r) => Array.from({ length: cols }).map((__, c) => {
        const key = `${r}-${c}`
        return <rect key={key} x={c * 40} y={r * 40} width={34} height={34} rx={2} fill={filled.has(key) ? 'var(--accent)' : 'transparent'} fillOpacity={filled.has(key) ? 0.9 : 1} stroke="var(--ink-line)" strokeWidth={1} />
      }))}
    </svg>
  )
}

export default function LoginPage() {
  const { users, login, pushToast } = useWarex()
  const [email, setEmail] = useState('admin@warex.com')
  const [password, setPassword] = useState('admin123')
  const [showPassword, setShowPassword] = useState(false)
  const [error, setError] = useState('')
  const demoUsers = useMemo(() => users.filter((u) => u.active).slice(0, 6), [users])

  function handleSubmit(e) {
    e.preventDefault()
    setError('')
    if (!email.trim() || !password) {
      setError('Email and password are required.')
      return
    }
    const result = login(email, password)
    if (!result.ok) setError(result.error)
  }

  function fill(user) {
    setEmail(user.email)
    setPassword(user.password)
    setError('')
    pushToast(`Loaded ${user.name}'s demo account.`)
  }

  return (
    <div className="min-h-screen flex flex-col lg:flex-row">
      <div className="lg:w-[42%] flex flex-col justify-between px-8 py-10 lg:px-14 lg:py-14" style={{ background: 'var(--ink)', color: 'var(--ink-muted)' }}>
        <div>
          <div className="flex items-baseline gap-2">
            <span className="text-2xl font-bold tracking-tight" style={{ color: '#fff' }}>WAREX</span>
            <span className="text-xs font-mono-data" style={{ color: 'var(--accent)' }}>v2.0</span>
          </div>
          <p className="mt-3 max-w-sm text-sm leading-relaxed">A role-driven warehouse management system that connects ordering, inventory, shipments, delivery, restocking and after-sales service.</p>
        </div>
        <div className="hidden lg:flex justify-center py-8"><RackMotif /></div>
        <div className="hidden lg:grid grid-cols-3 gap-6 pt-6" style={{ borderTop: '1px solid var(--ink-line)' }}>
          <div><div className="font-mono-data text-lg" style={{ color: '#fff' }}>24/7</div><div className="text-xs mt-1">workflow visibility</div></div>
          <div><div className="font-mono-data text-lg" style={{ color: '#fff' }}>6</div><div className="text-xs mt-1">managed roles</div></div>
          <div><div className="font-mono-data text-lg" style={{ color: '#fff' }}>B2B</div><div className="text-xs mt-1">bulk distribution</div></div>
        </div>
      </div>

      <div className="flex-1 flex items-center justify-center px-6 py-12" style={{ background: 'var(--paper)' }}>
        <div className="w-full max-w-md">
          <div className="flex items-center gap-2 text-xs font-medium" style={{ color: 'var(--accent-dim)' }}><ShieldCheck size={15} /> Main Admin controls role assignment</div>
          <h1 className="mt-3 text-2xl font-semibold" style={{ color: 'var(--text)' }}>Sign in to WAREX</h1>
          <p className="mt-1 text-sm" style={{ color: 'var(--muted)' }}>Use the email and password created by the Main Admin.</p>

          <form onSubmit={handleSubmit} className="mt-6 space-y-4">
            <div>
              <label className="block text-xs font-medium mb-1.5" style={{ color: 'var(--text)' }}>Registered email</label>
              <input value={email} onChange={(e) => setEmail(e.target.value)} type="email" autoComplete="email" className="w-full px-3 py-2.5 text-sm rounded-md outline-none" style={{ background: 'var(--paper-panel)', border: '1px solid var(--paper-line)', color: 'var(--text)' }} placeholder="name@company.com" />
            </div>
            <div>
              <label className="block text-xs font-medium mb-1.5" style={{ color: 'var(--text)' }}>Password</label>
              <div className="relative">
                <input value={password} onChange={(e) => setPassword(e.target.value)} type={showPassword ? 'text' : 'password'} autoComplete="current-password" className="w-full pl-3 pr-10 py-2.5 text-sm rounded-md outline-none" style={{ background: 'var(--paper-panel)', border: '1px solid var(--paper-line)', color: 'var(--text)' }} placeholder="••••••••" />
                <button type="button" onClick={() => setShowPassword((v) => !v)} className="absolute right-3 top-1/2 -translate-y-1/2" style={{ color: 'var(--muted)' }} aria-label="Toggle password visibility">{showPassword ? <EyeOff size={16} /> : <Eye size={16} />}</button>
              </div>
            </div>
            {error && <div className="text-xs rounded-md px-3 py-2" style={{ background: 'var(--signal-red-bg)', color: 'var(--signal-red)' }}>{error}</div>}
            <button type="submit" className="w-full inline-flex items-center justify-center gap-2 py-2.5 rounded-md text-sm font-medium" style={{ background: 'var(--accent)', color: 'var(--accent-ink)' }}>
              Sign in <ArrowRight size={15} />
            </button>
          </form>

          <div className="mt-6">
            <div className="text-xs font-medium" style={{ color: 'var(--text)' }}>Demo accounts</div>
            <div className="mt-2 grid grid-cols-2 gap-2">
              {demoUsers.map((u) => (
                <button key={u.id} type="button" onClick={() => fill(u)} className="text-left rounded-md px-3 py-2 transition hover:opacity-80" style={{ background: 'var(--paper-panel)', border: '1px solid var(--paper-line)' }}>
                  <div className="text-xs font-medium truncate" style={{ color: 'var(--text)' }}>{u.name}</div>
                  <div className="text-[11px] mt-0.5 truncate" style={{ color: 'var(--muted)' }}>{u.roleId.replaceAll('_', ' ')}</div>
                </button>
              ))}
            </div>
          </div>

          <p className="mt-5 text-[11px] leading-relaxed" style={{ color: 'var(--muted)' }}>Frontend demo note: credentials are stored locally for this prototype. In the backend phase, authentication and password storage will move to the server.</p>
        </div>
      </div>
    </div>
  )
}
