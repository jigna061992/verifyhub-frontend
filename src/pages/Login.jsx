import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import {
  ShieldCheck, Store, User, Lock, Eye, EyeOff, LogIn, Moon, Sun,
  CheckCircle2, AlertCircle, Wallet, BarChart3,
} from 'lucide-react'
import { useAuth } from '../context/AuthContext'
import useTheme from '../hooks/useTheme'

const ROLES = {
  super_admin: {
    label: 'Super Admin',
    icon: ShieldCheck,
    hint: 'Platform owner access: manage retailers, pricing, wallets and reports.',
  },
  retailer: {
    label: 'Retailer',
    icon: Store,
    hint: 'Retailer access: verify customers, manage your wallet and download reports.',
  },
}

const FEATURES = [
  { icon: ShieldCheck, title: 'Consent-first checks', text: 'Every request requires explicit customer consent' },
  { icon: EyeOff, title: 'Masked by default', text: 'Identifiers are masked across tables and exports' },
  { icon: Wallet, title: 'Prepaid wallets', text: 'Per-retailer balances with a full credit/debit ledger' },
  { icon: BarChart3, title: 'Clear reporting', text: 'Usage, revenue and margins in one view' },
]

const inputClass =
  'w-full rounded-xl border border-slate-300 bg-white py-3 pl-10 pr-3 text-sm text-slate-900 outline-none transition focus:border-brand-500 focus:ring-2 focus:ring-brand-200 dark:border-slate-700 dark:bg-slate-800 dark:text-white dark:focus:ring-brand-900'

export default function Login() {
  const { login } = useAuth()
  const navigate = useNavigate()
  const [dark, toggleTheme] = useTheme()

  const [role, setRole] = useState('super_admin')
  const [form, setForm] = useState({ login: '', password: '' })
  const [remember, setRemember] = useState(true)
  const [showPassword, setShowPassword] = useState(false)
  const [error, setError] = useState('')
  const [submitting, setSubmitting] = useState(false)

  // Show the "signed out" message once, then remove the flag
  const [signedOut] = useState(() => {
    const flag = sessionStorage.getItem('signed_out') === '1'
    sessionStorage.removeItem('signed_out')
    return flag
  })

  // Show the "password changed" message once (set by the Reset password page)
  const [passwordReset] = useState(() => {
    const flag = sessionStorage.getItem('password_reset') === '1'
    sessionStorage.removeItem('password_reset')
    return flag
  })

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')
    setSubmitting(true)
    try {
      const user = await login({ ...form, role, remember })
      navigate(user.role === 'super_admin' ? '/admin' : '/retailer', { replace: true })
    } catch (err) {
      const data = err.response?.data
      const firstValidation = data?.errors && Object.values(data.errors)[0]?.[0]
      setError(firstValidation || data?.message || 'Unable to sign in. Please try again.')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="grid min-h-screen font-sans lg:grid-cols-2">
      {/* ---------- Left brand panel ---------- */}
      <aside className="relative hidden flex-col justify-between overflow-hidden bg-gradient-to-br from-brand-950 via-brand-900 to-brand-800 p-12 text-white lg:flex">
        {/* Subtle grid background */}
        <div
          className="absolute inset-0 opacity-10"
          style={{
            backgroundImage:
              'linear-gradient(rgba(255,255,255,.5) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,.5) 1px, transparent 1px)',
            backgroundSize: '44px 44px',
          }}
        />
        {/* Soft gold glow */}
        <div className="absolute -right-24 -top-24 h-72 w-72 rounded-full bg-accent-400/20 blur-3xl" />

        {/* Brand */}
        <div className="relative flex items-center gap-3">
          <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-accent-400 text-brand-950">
            <ShieldCheck className="h-6 w-6" />
          </span>
          <div className="leading-tight">
            <div className="text-xl font-bold">Verify<span className="text-accent-400">Hub</span></div>
            <div className="text-[10px] font-semibold tracking-widest text-brand-200">KYC PLATFORM</div>
          </div>
        </div>

        {/* Headline + features */}
        <div className="relative">
          <h1 className="text-5xl font-extrabold leading-tight">
            KYC verification infrastructure for{' '}
            <span className="text-accent-400">India's retail network.</span>
          </h1>
          <p className="mt-5 max-w-md text-brand-100">
            Onboard retailers, meter every PAN, GSTIN and bank-account check against a prepaid
            wallet, and see the whole network from one secure console.
          </p>

          <div className="mt-8 grid max-w-xl grid-cols-2 gap-4">
            {FEATURES.map(({ icon: Icon, title, text }) => (
              <div key={title} className="rounded-xl border border-white/10 bg-white/5 p-4">
                <div className="flex items-center gap-2 text-sm font-semibold">
                  <Icon className="h-4 w-4 text-accent-400" /> {title}
                </div>
                <p className="mt-1 text-xs text-brand-100">{text}</p>
              </div>
            ))}
          </div>
        </div>

        <p className="relative text-xs text-brand-200">© 2026 VerifyHub. All rights reserved.</p>
      </aside>

      {/* ---------- Right form panel ---------- */}
      <main className="relative flex items-center justify-center bg-slate-50 px-6 py-12 dark:bg-slate-950">
        <button
          type="button"
          onClick={toggleTheme}
          aria-label="Toggle dark mode"
          className="absolute right-6 top-6 rounded-lg p-2 text-slate-500 hover:bg-slate-200 dark:text-slate-300 dark:hover:bg-slate-800"
        >
          {dark ? <Sun className="h-5 w-5" /> : <Moon className="h-5 w-5" />}
        </button>

        <div className="w-full max-w-md rounded-3xl border border-slate-200 bg-white p-8 shadow-xl dark:border-slate-800 dark:bg-slate-900">
          <h2 className="text-3xl font-extrabold text-slate-900 dark:text-white">Welcome back</h2>
          <p className="mt-2 text-sm text-slate-500 dark:text-slate-400">Sign in to your VerifyHub console.</p>

          {signedOut && (
            <div className="mt-5 flex items-center gap-2 rounded-lg border border-brand-200 bg-brand-50 px-4 py-3 text-sm text-brand-800 dark:border-brand-800 dark:bg-brand-950 dark:text-brand-200">
              <CheckCircle2 className="h-4 w-4 shrink-0" />
              You have been signed out securely.
            </div>
          )}

          {passwordReset && (
            <div className="mt-5 flex items-center gap-2 rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-800 dark:border-emerald-800 dark:bg-emerald-950 dark:text-emerald-300">
              <CheckCircle2 className="h-4 w-4 shrink-0" />
              Your password has been changed. Please sign in with the new password.
            </div>
          )}

          {error && (
            <div className="mt-5 flex items-center gap-2 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700 dark:border-red-800 dark:bg-red-950 dark:text-red-300">
              <AlertCircle className="h-4 w-4 shrink-0" />
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="mt-6 space-y-5" autoComplete="off">
            {/* Role toggle */}
            <div>
              <label className="mb-2 block text-xs font-semibold text-slate-600 dark:text-slate-300">Sign in as</label>
              <div className="grid grid-cols-2 gap-1 rounded-xl bg-slate-100 p-1 dark:bg-slate-800">
                {Object.entries(ROLES).map(([key, { label, icon: Icon }]) => (
                  <button
                    key={key}
                    type="button"
                    onClick={() => setRole(key)}
                    className={`flex items-center justify-center gap-2 rounded-lg py-2.5 text-sm font-semibold transition ${
                      role === key
                        ? 'bg-brand-700 text-white shadow'
                        : 'text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200'
                    }`}
                  >
                    <Icon className="h-4 w-4" /> {label}
                  </button>
                ))}
              </div>
              <p className="mt-2 text-xs text-slate-500 dark:text-slate-400">{ROLES[role].hint}</p>
            </div>

            {/* Email or mobile */}
            <div>
              <label className="mb-2 block text-xs font-semibold text-slate-600 dark:text-slate-300">
                Email or mobile number
              </label>
              <div className="relative">
                <User className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                <input
                  type="text"
                  name="vh_login"
                  autoComplete="off"
                  placeholder="name@company.in or 98XXXXXXXX"
                  value={form.login}
                  onChange={(e) => setForm({ ...form, login: e.target.value })}
                  required
                  className={inputClass}
                />
              </div>
            </div>

            {/* Password */}
            <div>
              <div className="mb-2 flex items-center justify-between">
                <label className="text-xs font-semibold text-slate-600 dark:text-slate-300">Password</label>
                <Link to="/forgot-password" className="text-xs font-semibold text-brand-700 hover:underline dark:text-brand-300">
                  Forgot password?
                </Link>
              </div>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                <input
                  type={showPassword ? 'text' : 'password'}
                  name="vh_password"
                  autoComplete="new-password"
                  placeholder="Enter your password"
                  value={form.password}
                  onChange={(e) => setForm({ ...form, password: e.target.value })}
                  required
                  className={`${inputClass} pr-10`}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((s) => !s)}
                  aria-label={showPassword ? 'Hide password' : 'Show password'}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                >
                  {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </div>

            {/* Remember me */}
            <div className="flex items-center justify-between text-sm">
              <label className="flex cursor-pointer items-center gap-2 text-slate-700 dark:text-slate-300">
                <input
                  type="checkbox"
                  checked={remember}
                  onChange={(e) => setRemember(e.target.checked)}
                  className="h-4 w-4 rounded border-slate-300 accent-brand-600"
                />
                Keep me signed in
              </label>
              <span className="flex items-center gap-1 text-xs text-slate-400">
                <Lock className="h-3 w-3" /> Secure connection
              </span>
            </div>

            <button
              type="submit"
              disabled={submitting}
              className="flex w-full items-center justify-center gap-2 rounded-xl bg-brand-700 py-3 text-sm font-semibold text-white shadow hover:bg-brand-800 disabled:cursor-not-allowed disabled:opacity-60"
            >
              <LogIn className="h-4 w-4" />
              {submitting ? 'Signing in...' : 'Sign in securely'}
            </button>
          </form>
        </div>
      </main>
    </div>
  )
}