import { useEffect, useRef, useState } from 'react'
import { Link, NavLink, Outlet, useLocation, useNavigate } from 'react-router-dom'
import {
  ShieldCheck, LayoutDashboard, Store, Tags, Wallet, FileCheck2, BarChart3,
  ClipboardList, History, UserCog, Menu, X, Moon, Sun, LogOut, CreditCard, FileText,
  Fingerprint, Landmark, FileSignature, Bell, Scale, Search, ChevronDown, ChevronRight, Lock,
} from 'lucide-react'
import api from '../../api/axios'
import { useAuth } from '../../context/AuthContext'
import useTheme from '../../hooks/useTheme'
import NotificationBell from '../NotificationBell'

const NAV = {
  super_admin: [
    { section: 'Dashboard' },
    { to: '/admin', label: 'Overview', icon: LayoutDashboard, end: true },
    { section: 'Management' },
    { to: '/admin/retailers', label: 'Retailers', icon: Store },
    { to: '/admin/kyc-services', label: 'KYC Services', icon: ShieldCheck },
    { to: '/admin/pricing', label: 'Pricing', icon: Tags },
    { to: '/admin/wallet', label: 'Wallet Top-ups', icon: Wallet },
    { to: '/admin/wallets', label: 'Retailer Wallets', icon: CreditCard },
    { section: 'Insights' },
    { to: '/admin/verifications', label: 'Verification Records', icon: FileCheck2 },
    { to: '/admin/kyc-cases', label: 'KYC Cases', icon: ClipboardList },
    { to: '/admin/reconciliation', label: 'Reconciliation', icon: Scale },
    { to: '/admin/reports', label: 'Reports', icon: BarChart3 },
    { section: 'System' },
    { to: '/admin/audit-logs', label: 'Audit Log', icon: FileText },
    { to: '/admin/profile', label: 'My Account', icon: UserCog },
  ],
  // Links with "service" are shown only when that service is enabled for the retailer
  retailer: [
    { section: 'Dashboard' },
    { to: '/retailer', label: 'Overview', icon: LayoutDashboard, end: true },
    { section: 'Verify' },
    { to: '/retailer/kyc', label: 'Complete KYC', icon: ClipboardList },
    { to: '/retailer/verify/aadhaar', label: 'Aadhaar Verification', icon: Fingerprint, service: 'AADHAAR' },
    { to: '/retailer/verify/pan', label: 'PAN Verification', icon: CreditCard, service: 'PAN' },
    { to: '/retailer/verify/bank', label: 'Bank Penny Drop', icon: Landmark, service: 'BANK' },
    { to: '/retailer/verify/esign', label: 'Consent e-Sign', icon: FileSignature, service: 'ESIGN' },
    { section: 'Account' },
    { to: '/retailer/wallet', label: 'Wallet', icon: Wallet },
    { to: '/retailer/history', label: 'History', icon: History },
    { to: '/retailer/notifications', label: 'Notifications', icon: Bell },
    { to: '/retailer/profile', label: 'Profile', icon: UserCog },
  ],
}

const ROLE_LABEL = { super_admin: 'Super Admin', retailer: 'Retailer' }

const iconBtn =
  'rounded-lg p-2 text-slate-500 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800'

// Closes a dropdown on outside click or Esc
function useDismiss(open, setOpen) {
  const box = useRef(null)

  useEffect(() => {
    if (!open) return undefined
    const onClick = (e) => box.current && !box.current.contains(e.target) && setOpen(false)
    const onKey = (e) => e.key === 'Escape' && setOpen(false)

    document.addEventListener('mousedown', onClick)
    document.addEventListener('keydown', onKey)
    return () => {
      document.removeEventListener('mousedown', onClick)
      document.removeEventListener('keydown', onKey)
    }
  }, [open, setOpen])

  return box
}

// Admin bell: the same numbers as the sidebar badges, as a small list
function AdminBell({ pendingTopups, openRecon }) {
  const [open, setOpen] = useState(false)
  const box = useDismiss(open, setOpen)
  const total = pendingTopups + openRecon
  const items = [
    pendingTopups > 0 && { to: '/admin/wallet', icon: Wallet, title: `${pendingTopups} top-up request(s) waiting`, text: 'Approve or reject the fund requests' },
    openRecon > 0 && { to: '/admin/reconciliation', icon: Scale, title: `${openRecon} check(s) to reconcile`, text: 'Provider answer unknown, money is on hold' },
  ].filter(Boolean)

  return (
    <div className="relative" ref={box}>
      <button type="button" onClick={() => setOpen((o) => !o)} aria-label="Alerts" aria-expanded={open} className={`relative ${iconBtn}`}>
        <Bell className="h-5 w-5" />
        {total > 0 && <span className="absolute right-1.5 top-1.5 h-2 w-2 rounded-full bg-red-500 ring-2 ring-white dark:ring-slate-900" />}
      </button>

      {open && (
        <div className="absolute right-0 top-full z-50 mt-2 w-80 max-w-[calc(100vw-2rem)] overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-xl dark:border-slate-700 dark:bg-slate-900">
          <div className="border-b border-slate-100 px-4 py-3 text-sm font-semibold text-slate-900 dark:border-slate-800 dark:text-white">Alerts</div>
          {items.length === 0 && <p className="px-4 py-8 text-center text-sm text-slate-500 dark:text-slate-400">Nothing needs your attention.</p>}
          {items.map(({ to, icon: Icon, title, text }) => (
            <Link key={to} to={to} onClick={() => setOpen(false)} className="flex items-start gap-3 px-4 py-3 hover:bg-slate-50 dark:hover:bg-slate-800">
              <span className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-amber-50 text-amber-600 dark:bg-amber-500/15 dark:text-amber-300">
                <Icon className="h-4 w-4" />
              </span>
              <span>
                <span className="block text-sm font-semibold text-slate-900 dark:text-white">{title}</span>
                <span className="block text-xs text-slate-500 dark:text-slate-400">{text}</span>
              </span>
            </Link>
          ))}
        </div>
      )}
    </div>
  )
}

function UserMenu({ user, initials, logout }) {
  const [open, setOpen] = useState(false)
  const box = useDismiss(open, setOpen)
  const profile = user.role === 'super_admin' ? '/admin/profile' : '/retailer/profile'

  return (
    <div className="relative" ref={box}>
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-expanded={open}
        className="flex items-center gap-3 rounded-xl py-1.5 pl-1.5 pr-2.5 hover:bg-slate-100 dark:hover:bg-slate-800"
      >
        <span className="flex h-9 w-9 items-center justify-center rounded-full bg-emerald-600 text-xs font-bold text-white">{initials}</span>
        <span className="hidden text-left leading-tight sm:block">
          <span className="block text-sm font-semibold text-slate-900 dark:text-white">{user.name}</span>
          <span className="block text-[11px] text-slate-500 dark:text-slate-400">{ROLE_LABEL[user.role] || user.role}</span>
        </span>
        <ChevronDown className="hidden h-4 w-4 text-slate-400 sm:block" />
      </button>

      {open && (
        <div className="absolute right-0 top-full z-50 mt-2 w-52 overflow-hidden rounded-2xl border border-slate-200 bg-white py-1 shadow-xl dark:border-slate-700 dark:bg-slate-900">
          <Link to={profile} onClick={() => setOpen(false)} className="flex items-center gap-2 px-4 py-2.5 text-sm text-slate-700 hover:bg-slate-50 dark:text-slate-200 dark:hover:bg-slate-800">
            <UserCog className="h-4 w-4" /> My account
          </Link>
          <button type="button" onClick={logout} className="flex w-full items-center gap-2 px-4 py-2.5 text-sm text-red-600 hover:bg-slate-50 dark:text-red-400 dark:hover:bg-slate-800">
            <LogOut className="h-4 w-4" /> Logout
          </button>
        </div>
      )}
    </div>
  )
}

export default function AppLayout() {
  const { user, logout } = useAuth()
  const [dark, toggleTheme] = useTheme()
  const navigate = useNavigate()
  const location = useLocation()
  const searchBox = useRef(null)
  const [open, setOpen] = useState(false)
  const [query, setQuery] = useState('')
  const [pendingTopups, setPendingTopups] = useState(0)
  const [openRecon, setOpenRecon] = useState(0)
  const [enabled, setEnabled] = useState(null) // service codes enabled for this retailer (null = not loaded yet)

  const isAdmin = user.role === 'super_admin'

  // Pending top-up count for the admin sidebar. Refreshes every minute and when a top-up is approved or rejected.
  useEffect(() => {
    if (!isAdmin) return undefined

    const load = () =>
      api
        .get('/admin/badges')
        .then((res) => {
          setPendingTopups(res.data.pending_topups)
          setOpenRecon(res.data.open_reconciliations ?? 0)
        })
        .catch(() => {})

    load()
    const timer = setInterval(load, 60000)
    window.addEventListener('badges:refresh', load)

    return () => {
      clearInterval(timer)
      window.removeEventListener('badges:refresh', load)
    }
  }, [isAdmin])

  // Retailer: which services are on (so the menu shows only those)
  useEffect(() => {
    if (user.role !== 'retailer') return
    api.get('/retailer/services').then((res) => setEnabled(res.data.map((s) => s.code))).catch(() => setEnabled(null))
  }, [user.role])

  // Press "/" anywhere to jump to the search box
  useEffect(() => {
    const onKey = (e) => {
      const typing = ['INPUT', 'TEXTAREA', 'SELECT'].includes(document.activeElement?.tagName)
      if (e.key === '/' && !typing) {
        e.preventDefault()
        searchBox.current?.focus()
      }
    }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [])

  const links = (NAV[user.role] || []).filter((l) => !l.service || enabled === null || enabled.includes(l.service))
  const current = links.find((l) => l.to && (l.end ? location.pathname === l.to : location.pathname.startsWith(l.to)))
  const initials = user.name
    .split(' ')
    .map((w) => w[0])
    .slice(0, 2)
    .join('')
    .toUpperCase()

  const submitSearch = (e) => {
    e.preventDefault()
    const q = query.trim()
    if (!q) return
    navigate(isAdmin ? `/admin/verifications?search=${encodeURIComponent(q)}` : '/retailer/history')
    setQuery('')
  }

  const badge = (to) => (to === '/admin/wallet' ? pendingTopups : to === '/admin/reconciliation' ? openRecon : 0)

  return (
    <div className="min-h-screen bg-slate-50 font-sans text-slate-900 dark:bg-slate-950">
      {/* Mobile overlay */}
      {open && <div className="fixed inset-0 z-30 bg-black/50 lg:hidden" onClick={() => setOpen(false)} />}

      {/* Sidebar */}
      <aside
        className={`fixed inset-y-0 left-0 z-40 flex w-64 flex-col bg-gradient-to-b from-navy-950 to-navy-900 text-white transition-transform lg:translate-x-0 ${
          open ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        <div className="flex h-16 items-center justify-between px-5">
          <div className="flex items-center gap-3">
            <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-brand-500 text-white shadow-lg shadow-brand-500/30">
              <ShieldCheck className="h-5 w-5" />
            </span>
            <div className="leading-tight">
              <div className="text-[17px] font-bold">Verify<span className="text-brand-400">Hub</span></div>
              <div className="text-[9px] font-semibold tracking-[0.18em] text-slate-400">KYC PLATFORM</div>
            </div>
          </div>
          <button className="lg:hidden" onClick={() => setOpen(false)} aria-label="Close menu">
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="px-5 pb-1 pt-3">
          <span className="inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/5 px-3 py-1 text-[11px] font-semibold uppercase tracking-wider text-slate-200">
            <ShieldCheck className="h-3.5 w-3.5" /> {ROLE_LABEL[user.role] || user.role}
          </span>
        </div>

        <nav className="thin-scroll mt-1 flex-1 space-y-0.5 overflow-y-auto px-3 pb-3">
          {links.map(({ to, label, icon: Icon, end, section }) =>
            section ? (
              <div key={section} className="px-3 pb-1.5 pt-5 text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-400/80">
                {section}
              </div>
            ) : (
              <NavLink
                key={to}
                to={to}
                end={end}
                onClick={() => setOpen(false)}
                className={({ isActive }) =>
                  `relative flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition ${
                    isActive ? 'bg-white/10 text-white' : 'text-slate-300 hover:bg-white/5 hover:text-white'
                  }`
                }
              >
                {({ isActive }) => (
                  <>
                    {isActive && <span className="absolute -left-3 top-1/2 h-6 w-1 -translate-y-1/2 rounded-r-full bg-brand-400" />}
                    <Icon className="h-[18px] w-[18px]" /> {label}
                    {badge(to) > 0 && (
                      <span className="ml-auto flex h-5 min-w-5 items-center justify-center rounded-full bg-accent-400 px-1.5 text-[11px] font-bold text-navy-950">
                        {badge(to)}
                      </span>
                    )}
                  </>
                )}
              </NavLink>
            )
          )}
        </nav>

        <div className="m-3 flex items-start gap-3 rounded-xl border border-white/10 bg-white/5 p-3">
          <span className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-emerald-500/15 text-emerald-400">
            <Lock className="h-4 w-4" />
          </span>
          <div className="text-xs leading-snug text-slate-300">
            <div className="font-semibold text-white">Secure console</div>
            Masked identifiers · every action is logged
          </div>
        </div>
      </aside>

      {/* Main area */}
      <div className="lg:pl-64">
        <header className="sticky top-0 z-20 flex h-16 items-center gap-3 border-b border-slate-200 bg-white/85 px-4 backdrop-blur dark:border-slate-800 dark:bg-slate-900/85 sm:px-6">
          <button className={`${iconBtn} lg:hidden`} onClick={() => setOpen(true)} aria-label="Open menu">
            <Menu className="h-5 w-5" />
          </button>

          <div className="min-w-0 leading-tight">
            <div className="hidden items-center gap-1 text-xs text-slate-500 dark:text-slate-400 sm:flex">
              {ROLE_LABEL[user.role]} <ChevronRight className="h-3 w-3" /> {current?.label || 'Overview'}
            </div>
            <div className="truncate text-lg font-bold text-slate-900 dark:text-white">{current?.label || 'Overview'}</div>
          </div>

          <div className="ml-auto flex items-center gap-2">
            {isAdmin && (
              <form onSubmit={submitSearch} className="relative hidden md:block">
                <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                <input
                  ref={searchBox}
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder="Search verifications..."
                  className="w-72 rounded-xl border border-slate-200 bg-slate-50 py-2 pl-9 pr-9 text-sm text-slate-900 placeholder:text-slate-400 focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-500/20 dark:border-slate-700 dark:bg-slate-950 dark:text-white"
                />
                <kbd className="absolute right-2.5 top-1/2 -translate-y-1/2 rounded border border-slate-200 px-1.5 text-[11px] text-slate-400 dark:border-slate-700">/</kbd>
              </form>
            )}

            <button onClick={toggleTheme} aria-label="Toggle dark mode" className={iconBtn}>
              {dark ? <Sun className="h-5 w-5" /> : <Moon className="h-5 w-5" />}
            </button>

            {isAdmin ? <AdminBell pendingTopups={pendingTopups} openRecon={openRecon} /> : <NotificationBell />}

            <UserMenu user={user} initials={initials} logout={logout} />
          </div>
        </header>

        <main className="p-4 sm:p-6">
          <Outlet />
        </main>
      </div>
    </div>
  )
}
