import { useState } from 'react'
import { Link } from 'react-router-dom'
import { Mail, Send, CheckCircle2, AlertCircle, ArrowLeft } from 'lucide-react'
import api from '../api/axios'
import AuthLayout from '../components/AuthLayout'
import { getErrorMessage } from '../utils/errors'
import { inputClass } from '../components/ui/Input'

export default function ForgotPassword() {
  const [email, setEmail] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [message, setMessage] = useState('')
  const [error, setError] = useState('')

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')
    setMessage('')
    setSubmitting(true)
    try {
      const res = await api.post('/forgot-password', { email: email.trim() })
      setMessage(res.data.message)
    } catch (err) {
      // 429 = too many tries, 422 = email format wrong
      setError(
        err.response?.status === 429
          ? 'Too many requests. Please wait a minute and try again.'
          : getErrorMessage(err, 'Unable to send the reset link. Please try again.')
      )
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <AuthLayout
      title="Forgot password?"
      subtitle="Enter the email of your account. We will send you a link to set a new password."
    >
      {message ? (
        <div className="space-y-5">
          <div className="flex items-start gap-2 rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-800 dark:border-emerald-800 dark:bg-emerald-950 dark:text-emerald-300">
            <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0" />
            {message}
          </div>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            Did not get it? Check the spam folder, or wait a minute and try again.
          </p>
          <button
            type="button"
            onClick={() => setMessage('')}
            className="text-sm font-semibold text-brand-700 hover:underline dark:text-brand-300"
          >
            Send again
          </button>
        </div>
      ) : (
        <form onSubmit={handleSubmit} className="space-y-5">
          {error && (
            <div className="flex items-center gap-2 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700 dark:border-red-800 dark:bg-red-950 dark:text-red-300">
              <AlertCircle className="h-4 w-4 shrink-0" />
              {error}
            </div>
          )}

          <div>
            <label htmlFor="email" className="mb-2 block text-xs font-semibold text-slate-600 dark:text-slate-300">
              Email address
            </label>
            <div className="relative">
              <Mail className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
              <input
                id="email"
                type="email"
                autoComplete="email"
                placeholder="name@company.in"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                className={`${inputClass} pl-10`}
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={submitting}
            className="flex w-full items-center justify-center gap-2 rounded-xl bg-brand-700 py-3 text-sm font-semibold text-white shadow hover:bg-brand-800 disabled:cursor-not-allowed disabled:opacity-60"
          >
            <Send className="h-4 w-4" />
            {submitting ? 'Sending...' : 'Send reset link'}
          </button>
        </form>
      )}

      <Link
        to="/login"
        className="mt-6 flex items-center justify-center gap-1 text-sm font-semibold text-slate-600 hover:text-brand-700 dark:text-slate-300"
      >
        <ArrowLeft className="h-4 w-4" /> Back to sign in
      </Link>
    </AuthLayout>
  )
}
