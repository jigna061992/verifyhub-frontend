import { Link } from 'react-router-dom'
import { ShieldCheck, Moon, Sun } from 'lucide-react'
import useTheme from '../hooks/useTheme'

// Simple centered card used by Forgot password and Reset password pages
export default function AuthLayout({ title, subtitle, children }) {
  const [dark, toggleTheme] = useTheme()

  return (
    <div className="relative flex min-h-screen items-center justify-center bg-slate-50 px-6 py-12 font-sans dark:bg-slate-950">
      <button
        type="button"
        onClick={toggleTheme}
        aria-label="Toggle dark mode"
        className="absolute right-6 top-6 rounded-lg p-2 text-slate-500 hover:bg-slate-200 dark:text-slate-300 dark:hover:bg-slate-800"
      >
        {dark ? <Sun className="h-5 w-5" /> : <Moon className="h-5 w-5" />}
      </button>

      <div className="w-full max-w-md">
        <Link to="/login" className="mb-6 flex items-center justify-center gap-3">
          <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-brand-700 text-white">
            <ShieldCheck className="h-6 w-6" />
          </span>
          <span className="text-xl font-bold text-slate-900 dark:text-white">
            Verify<span className="text-brand-500">Hub</span>
          </span>
        </Link>

        <div className="rounded-3xl border border-slate-200 bg-white p-8 shadow-xl dark:border-slate-800 dark:bg-slate-900">
          <h1 className="text-2xl font-extrabold text-slate-900 dark:text-white">{title}</h1>
          {subtitle && <p className="mt-2 text-sm text-slate-500 dark:text-slate-400">{subtitle}</p>}
          <div className="mt-6">{children}</div>
        </div>
      </div>
    </div>
  )
}