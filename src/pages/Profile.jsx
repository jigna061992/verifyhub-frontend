import { useCallback, useEffect, useState } from 'react'
import { Eye, EyeOff, Lock, ShieldCheck } from 'lucide-react'
import api from '../api/axios'
import Card from '../components/ui/Card'
import StatusBadge from '../components/ui/StatusBadge'
import Toast from '../components/ui/Toast'
import { inputClass } from '../components/ui/Input'
import { getErrorMessage, getFieldErrors } from '../utils/errors'

const dateText = (iso) =>
  iso ? new Date(iso).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }) : '-'

function Row({ label, value, mono = false }) {
  return (
    <div className="flex justify-between gap-4 py-2.5 text-sm">
      <dt className="shrink-0 text-slate-500 dark:text-slate-400">{label}</dt>
      <dd className={`text-right font-semibold text-slate-900 dark:text-white ${mono ? 'font-mono text-xs' : ''}`}>
        {value || '-'}
      </dd>
    </div>
  )
}

function PasswordInput({ id, label, value, onChange, error, autoComplete, hint }) {
  const [show, setShow] = useState(false)

  return (
    <div>
      <label htmlFor={id} className="mb-1.5 block text-xs font-semibold text-slate-700 dark:text-slate-200">
        {label}
      </label>
      <div className="relative">
        <Lock className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
        <input
          id={id}
          type={show ? 'text' : 'password'}
          value={value}
          onChange={onChange}
          autoComplete={autoComplete}
          className={`${inputClass} pl-9 pr-10 ${error ? 'border-red-400' : ''}`}
          required
        />
        <button
          type="button"
          onClick={() => setShow((v) => !v)}
          aria-label={show ? 'Hide password' : 'Show password'}
          className="absolute right-2 top-1/2 -translate-y-1/2 rounded-lg p-1.5 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
        >
          {show ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
        </button>
      </div>
      {hint && !error && <p className="mt-1.5 text-xs text-slate-400">{hint}</p>}
      {error && <p className="mt-1.5 text-xs text-red-600">{error}</p>}
    </div>
  )
}

function ChangePassword({ notify }) {
  const empty = { current_password: '', password: '', password_confirmation: '' }
  const [form, setForm] = useState(empty)
  const [errors, setErrors] = useState({})
  const [formError, setFormError] = useState('')
  const [saving, setSaving] = useState(false)

  const set = (key) => (e) => setForm({ ...form, [key]: e.target.value })

  const submit = async (e) => {
    e.preventDefault()
    if (saving) return

    setErrors({})
    setFormError('')
    setSaving(true)

    try {
      const res = await api.put('/account/password', form)
      setForm(empty)
      notify({ type: 'success', text: res.data.message })
    } catch (err) {
      const fieldErrors = getFieldErrors(err)
      setErrors(fieldErrors)
      if (Object.keys(fieldErrors).length === 0) setFormError(getErrorMessage(err))
    } finally {
      setSaving(false)
    }
  }

  return (
    <Card title="Change password">
      <form onSubmit={submit} className="space-y-4" autoComplete="off">
        {formError && (
          <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700 dark:bg-red-950 dark:text-red-300">{formError}</p>
        )}

        <PasswordInput
          id="current_password"
          label="Current password"
          value={form.current_password}
          onChange={set('current_password')}
          error={errors.current_password}
          autoComplete="current-password"
        />
        <PasswordInput
          id="password"
          label="New password"
          value={form.password}
          onChange={set('password')}
          error={errors.password}
          autoComplete="new-password"
          hint="Minimum 8 characters, with letters and numbers."
        />
        <PasswordInput
          id="password_confirmation"
          label="Confirm new password"
          value={form.password_confirmation}
          onChange={set('password_confirmation')}
          error={errors.password_confirmation}
          autoComplete="new-password"
        />

        <button
          type="submit"
          disabled={saving}
          className="rounded-xl bg-brand-700 px-5 py-2.5 text-sm font-semibold text-white hover:bg-brand-800 disabled:opacity-60"
        >
          {saving ? 'Saving...' : 'Change password'}
        </button>
        <p className="text-xs text-slate-400">After changing it, you stay signed in here and are signed out from your other devices.</p>
      </form>
    </Card>
  )
}

export default function Profile() {
  const [data, setData] = useState(null)
  const [error, setError] = useState('')
  const [toast, setToast] = useState(null)
  const closeToast = useCallback(() => setToast(null), [])

  useEffect(() => {
    api
      .get('/account')
      .then((res) => setData(res.data))
      .catch((err) => setError(getErrorMessage(err, 'Unable to load your account.')))
  }, [])

  const initials = (data?.name || '')
    .split(' ')
    .filter(Boolean)
    .map((w) => w[0])
    .slice(0, 2)
    .join('')
    .toUpperCase()

  return (
    <div className="space-y-6">
      <Toast toast={toast} onClose={closeToast} />

      <div>
        <h1 className="text-2xl font-bold text-slate-900 dark:text-white">{data?.retailer ? 'Profile' : 'My Account'}</h1>
        <p className="text-sm text-slate-500 dark:text-slate-400">Your details and sign-in security.</p>
      </div>

      {error && <p className="text-sm text-red-600">{error}</p>}
      {!data && !error && <p className="text-sm text-slate-400">Loading...</p>}

      {data && (
        <div className="grid gap-6 lg:grid-cols-2">
          <div className="space-y-6">
            <Card>
              <div className="flex items-center gap-4">
                <span className="flex h-14 w-14 items-center justify-center rounded-full bg-brand-700 text-lg font-bold text-white">
                  {initials}
                </span>
                <div>
                  <div className="text-lg font-bold text-slate-900 dark:text-white">{data.name}</div>
                  <div className="text-sm capitalize text-slate-500 dark:text-slate-400">{data.role.replace('_', ' ')}</div>
                </div>
              </div>
              <dl className="mt-4 divide-y divide-slate-100 dark:divide-slate-800">
                <Row label="Email" value={data.email} />
                <Row label="Mobile" value={data.mobile ? `+91 ${data.mobile}` : ''} />
                <Row label="Member since" value={dateText(data.member_since)} />
              </dl>
            </Card>

            {data.retailer && (
              <Card title="Business details">
                <dl className="divide-y divide-slate-100 dark:divide-slate-800">
                  <Row label="Retailer ID" value={data.retailer.code} mono />
                  <Row label="Business name" value={data.retailer.business_name} />
                  <Row label="Address" value={data.retailer.address} />
                  <Row label="PAN" value={data.retailer.pan_masked} mono />
                  <Row label="GST" value={data.retailer.gst_masked} mono />
                  <div className="flex items-center justify-between py-2.5 text-sm">
                    <dt className="text-slate-500 dark:text-slate-400">Account status</dt>
                    <dd><StatusBadge status={data.retailer.status} /></dd>
                  </div>
                </dl>
                <p className="mt-3 flex items-start gap-2 text-xs text-slate-400">
                  <ShieldCheck className="mt-0.5 h-4 w-4 shrink-0" />
                  PAN and GST are shown masked. To change business details, please contact the administrator.
                </p>
              </Card>
            )}
          </div>

          <ChangePassword notify={setToast} />
        </div>
      )}
    </div>
  )
}
