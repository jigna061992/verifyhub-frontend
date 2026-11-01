import { useEffect, useState } from 'react'
import { NavLink, Outlet } from 'react-router-dom'
import {
  ShieldCheck, LayoutDashboard, Store, Tags, Wallet, FileCheck2, BarChart3,
  UserCheck, ClipboardList, History, UserCog, Menu, X, Moon, Sun, LogOut, CreditCard, FileText,
} from 'lucide-react'
import api from '../../api/axios'
import { useAuth } from '../../context/AuthContext'
import useTheme from '../../hooks/useTheme'

const NAV = {
  super_admin: [
    { to: '/admin', label: 'Dashboard', icon: LayoutDashboard, end: true },
    { to: '/admin/retailers', label: 'Retailers', icon: Store },
    { to: '/admin/kyc-services', label: 'KYC Services', icon: ShieldCheck },
    { to: '/admin/pricing', label: 'Services & Pricing', icon: Tags },
    { to: '/admin/wallet', label: 'Wallet Top-ups', icon: Wallet },
    { to: '/admin/wallets', label: 'Retailer Wallets', icon: CreditCard },
    { to: '/admin/verifications', label: 'Verifications', icon: FileCheck2 },
    { to: '/admin/kyc-cases', label: 'KYC Cases', icon: ClipboardList },
    { to: '/admin/reports', label: 'Reports', icon: BarChart3 },
    { to: '/admin/audit-logs', label: 'Audit Log', icon: FileText },
    { to: '/admin/profile', label: 'My Account', icon: UserCog },
  ],
  retailer: [
    { to: '/retailer', label: 'Dashboard', icon: LayoutDashboard, end: true },
    { to: '/retailer/verify', label: 'Verify Customer', icon: UserCheck },
    { to: '/retailer/kyc', label: 'Complete KYC', icon: ClipboardList },
    { to: '/retailer/wallet', label: 'Wallet', icon: Wallet },
    { to: '/retailer/history', label: 'History', icon: History },
    { to: '/retailer/profile', label: 'Profile', icon: UserCog },
  ],
}

export default function AppLayout() {
  const { user, logout } = useAuth()
  const [dark, toggleTheme] = useTheme()
  const [open, setOpen] = useState(false)
  const [pendingTopups, setPendingTopups] = useState(0)

  // Pending top-up count for the admin sidebar. Refreshes every minute and when a top-up is approved or rejected.
  useEffect(() => {
    if (user.role !== 'super_admin') return undefined

    const load = () =>
      api.get('/admin/badges').then((res) => setPendingTopups(res.data.pending_topups)).catch(() => {})

    load()
    const timer = setInterval(load, 60000)
    window.addEventListener('badges:refresh', load)

    return () => {
      clearInterval(timer)
      window.removeEventListener('badges:refresh', load)
    }
  }, [user.role])

  const links = NAV[user.role] || []
  const initials = user.name
    .split(' ')
    .map((w) => w[0])
    .slice(0, 2)
    .join('')
    .toUpperCase()

  return (
    <div className="min-h-screen bg-slate-50 font-sans dark:bg-slate-950">
      {/* Mobile overlay */}
      {open && <div className="fixed inset-0 z-30 bg-black/40 lg:hidden" onClick={() => setOpen(false)} />}

      {/* Sidebar */}
      <aside
        className={`fixed inset-y-0 left-0 z-40 flex w-64 flex-col bg-gradient-to-b from-brand-950 to-brand-900 text-white transition-transform lg:translate-x-0 ${
          open ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        <div className="flex h-16 items-center justify-between px-5">
          <div className="flex items-center gap-3">
            <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-accent-400 text-brand-950">
              <ShieldCheck className="h-5 w-5" />
            </span>
            <div className="leading-tight">
              <div className="font-bold">Verify<span className="text-accent-400">Hub</span></div>
              <div className="text-[9px] font-semibold tracking-widest text-brand-200">KYC PLATFORM</div>
            </div>
          </div>
          <button className="lg:hidden" onClick={() => setOpen(false)} aria-label="Close menu">
            <X className="h-5 w-5" />
          </button>
        </div>

        <nav className="mt-4 flex-1 space-y-1 px-3">
          {links.map(({ to, label, icon: Icon, end }) => (
            <NavLink
              key={to}
              to={to}
              end={end}
              onClick={() => setOpen(false)}
              className={({ isActive }) =>
                `flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition ${
                  isActive
                    ? 'bg-brand-500 text-white shadow'
                    : 'text-brand-100 hover:bg-white/10 hover:text-white'
                }`
              }
            >
              <Icon className="h-4 w-4" /> {label}
              {to === '/admin/wallet' && pendingTopups > 0 && (
                <span className="ml-auto rounded-full bg-accent-400 px-2 py-0.5 text-[11px] font-bold text-brand-950">
                  {pendingTopups}
                </span>
              )}
            </NavLink>
          ))}
        </nav>

        <div className="border-t border-white/10 p-4 text-xs text-brand-200">
          {user.role === 'super_admin' ? 'Super Admin console' : 'Retailer console'}
        </div>
      </aside>

      {/* Main area */}
      <div className="lg:pl-64">
        <header className="sticky top-0 z-20 flex h-16 items-center justify-between border-b border-slate-200 bg-white/80 px-4 backdrop-blur dark:border-slate-800 dark:bg-slate-900/80 sm:px-6">
          <button
            className="rounded-lg p-2 text-slate-600 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800 lg:hidden"
            onClick={() => setOpen(true)}
            aria-label="Open menu"
          >
            <Menu className="h-5 w-5" />
          </button>

          <div className="hidden text-sm text-slate-500 dark:text-slate-400 lg:block">
            {new Date().toLocaleDateString('en-IN', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={toggleTheme}
              aria-label="Toggle dark mode"
              className="rounded-lg p-2 text-slate-500 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800"
            >
              {dark ? <Sun className="h-5 w-5" /> : <Moon className="h-5 w-5" />}
            </button>

            <div className="flex items-center gap-3 rounded-xl border border-slate-200 py-1.5 pl-2 pr-3 dark:border-slate-700">
              <span className="flex h-8 w-8 items-center justify-center rounded-full bg-brand-700 text-xs font-bold text-white">
                {initials}
              </span>
              <div className="hidden leading-tight sm:block">
                <div className="text-sm font-semibold text-slate-900 dark:text-white">{user.name}</div>
                <div className="text-[11px] capitalize text-slate-500 dark:text-slate-400">
                  {user.role.replace('_', ' ')}
                </div>
              </div>
            </div>

            <button
              onClick={logout}
              className="flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium text-slate-600 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800"
            >
              <LogOut className="h-4 w-4" />
              <span className="hidden sm:inline">Logout</span>
            </button>
          </div>
        </header>

        <main className="p-4 sm:p-6">
          <Outlet />
        </main>
      </div>
    </div>
  )
} 