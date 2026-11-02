import { useState } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import { Lock, Eye, EyeOff, KeyRound, AlertCircle } from 'lucide-react'
import api from '../api/axios'
import AuthLayout from '../components/AuthLayout'
import { getErrorMessage, getFieldErrors } from '../utils/errors'
import { inputClass } from '../components/ui/Input'

function PasswordField({ id, label, value, onChange, error, hint }) {
  const [show, setShow] = useState(false)
  return (
    <div>
      <label htmlFor={id} className="mb-2 block text-xs font-semibold text-slate-600 dark:text-slate-300">
        {label}
      </label>
      <div className="relative">
        <Lock className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
        <input
          id={id}
          type={show ? 'text' : 'password'}
          autoComplete="new-password"
          value={value}
          onChange={onChange}
          required
          className={`${inputClass} pl-10 pr-10 ${error ? 'border-red-400' : ''}`}
        />
        <button
          type="button"
          onClick={() => setShow((s) => !s)}
          aria-label={show ? 'Hide password' : 'Show password'}
          className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
        >
          {show ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
        </button>
      </div>
      {hint && !error && <p className="mt-1 text-xs text-slate-400">{hint}</p>}
      {error && <p className="mt-1 text-xs text-red-600">{error}</p>}
    </div>
  )
}

export default function ResetPassword() {
  const [params] = useSearchParams()
  const navigate = useNavigate()

  // The mail link looks like /reset-password?token=...&email=...
  const token = params.get('token') || ''
  const email = params.get('email') || ''

  const [form, setForm] = useState({ password: '', password_confirmation: '' })
  const [errors, setErrors] = useState({})
  const [error, setError] = useState('')
  const [submitting, setSubmitting] = useState(false)

  const set = (key) => (e) => setForm({ ...form, [key]: e.target.value })

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')
    setErrors({})
    setSubmitting(true)
    try {
      await api.post('/reset-password', { token, email, ...form })
      sessionStorage.setItem('password_reset', '1') // Login page shows a success message once
      navigate('/login', { replace: true })
    } catch (err) {
      if (err.response?.status === 429) {
        setError('Too many attempts. Please wait a minute and try again.')
      } else {
        const fields = getFieldErrors(err)
        // The "email" error means the link is bad or expired: show it on top, not under a field
        setError(fields.email || (Object.keys(fields).length ? '' : getErrorMessage(err)))
        const { email: _ignored, ...rest } = fields
        setErrors(rest)
      }
    } finally {
      setSubmitting(false)
    }
  }

  // Link opened without token or email (copied wrong)
  if (!token || !email) {
    return (
      <AuthLayout title="Invalid reset link">
        <div className="flex items-start gap-2 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700 dark:border-red-800 dark:bg-red-950 dark:text-red-300">
          <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
          This reset link is incomplete. Please request a new one.
        </div>
        <Link
          to="/forgot-password"
          className="mt-6 block text-center text-sm font-semibold text-brand-700 hover:underline dark:text-brand-300"
        >
          Request a new link
        </Link>
      </AuthLayout>
    )
  }

  return (
    <AuthLayout title="Set a new password" subtitle={`For ${email}`}>
      <form onSubmit={handleSubmit} className="space-y-5">
        {error && (
          <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700 dark:border-red-800 dark:bg-red-950 dark:text-red-300">
            <div className="flex items-start gap-2">
              <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
              <div>
                {error}
                {error.includes('expired') && (
                  <Link to="/forgot-password" className="mt-1 block font-semibold underline">
                    Request a new link
                  </Link>
                )}
              </div>
            </div>
          </div>
        )}

        <PasswordField
          id="password"
          label="New password"
          value={form.password}
          onChange={set('password')}
          error={errors.password}
          hint="At least 8 characters, with letters and numbers."
        />
        <PasswordField
          id="password_confirmation"
          label="Confirm new password"
          value={form.password_confirmation}
          onChange={set('password_confirmation')}
          error={errors.password_confirmation}
        />

        <button
          type="submit"
          disabled={submitting}
          className="flex w-full items-center justify-center gap-2 rounded-xl bg-brand-700 py-3 text-sm font-semibold text-white shadow hover:bg-brand-800 disabled:cursor-not-allowed disabled:opacity-60"
        >
          <KeyRound className="h-4 w-4" />
          {submitting ? 'Saving...' : 'Change password'}
        </button>
      </form>
    </AuthLayout>
  )
}
