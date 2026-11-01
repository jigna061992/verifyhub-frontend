import { useEffect, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import { Info } from 'lucide-react'
import api from '../../../api/axios'
import Input, { inputClass } from '../../../components/ui/Input'
import { formatINR } from '../../../utils/format'
import { getErrorMessage, getFieldErrors } from '../../../utils/errors'
import ConsentBox from './ConsentBox'
import ResultPanel from './ResultPanel'

const primaryBtn =
  'rounded-xl bg-brand-700 px-5 py-2.5 text-sm font-semibold text-white hover:bg-brand-800 disabled:cursor-not-allowed disabled:opacity-50'
const ghostBtn =
  'rounded-xl border border-slate-300 px-5 py-2.5 text-sm font-semibold text-slate-700 hover:bg-slate-50 disabled:opacity-50 dark:border-slate-700 dark:text-slate-200 dark:hover:bg-slate-800'

const EMPTY = { aadhaar: '', customer_name: '', purpose: '', consent: false }

// Stand-alone Aadhaar check: send OTP -> customer tells the OTP -> verify
export default function AadhaarCheck({ service, options, balance, onBalance }) {
  const [form, setForm] = useState({ ...EMPTY, purpose: options.purposes[0]?.value ?? '' })
  const [session, setSession] = useState(null)
  const [otp, setOtp] = useState('')
  const [errors, setErrors] = useState({})
  const [error, setError] = useState(null) // { text, noBalance }
  const [busy, setBusy] = useState(false)
  const [cooldown, setCooldown] = useState(0)

  // The Aadhaar number lives only in this variable while the check is open. It is needed again only to resend the OTP.
  const aadhaarRef = useRef('')

  const open = session?.status === 'pending'
  const done = session && session.status !== 'pending'
  const purposeLabel = options.purposes.find((p) => p.value === form.purpose)?.label ?? ''
  const lowBalance = (balance ?? options.wallet_available) < service.price && session === null

  useEffect(() => {
    setCooldown(session?.otp?.cooldown_left ?? 0)
  }, [session])

  useEffect(() => {
    if (cooldown <= 0) return undefined
    const timer = setTimeout(() => setCooldown((c) => c - 1), 1000)
    return () => clearTimeout(timer)
  }, [cooldown])

  const apply = (data) => {
    setSession(data)
    if (data.wallet_available !== undefined) onBalance(data.wallet_available)
    if (data.status !== 'pending') aadhaarRef.current = ''
  }

  const fail = (err) => {
    const fieldErrors = getFieldErrors(err)
    setErrors(fieldErrors)
    if (Object.keys(fieldErrors).length === 0) {
      setError({ text: getErrorMessage(err), noBalance: err?.response?.data?.code === 'insufficient_balance' })
    }
    // The check was closed meanwhile (expired, cancelled): show its final state
    if (['closed', 'expired'].includes(err?.response?.data?.code) && session) {
      api.get(`/retailer/verifications/${session.id}`).then((res) => apply(res.data)).catch(() => {})
    }
  }

  const run = async (call) => {
    if (busy) return
    setBusy(true)
    setErrors({})
    setError(null)
    try {
      apply((await call()).data)
    } catch (err) {
      fail(err)
    } finally {
      setBusy(false)
    }
  }

  const start = (e) => {
    e.preventDefault()
    aadhaarRef.current = form.aadhaar
    return run(() => api.post('/retailer/verifications/aadhaar', form))
  }

  const verify = (e) => {
    e.preventDefault()
    return run(async () => {
      try {
        return await api.post(`/retailer/verifications/${session.id}/aadhaar/verify`, { otp })
      } finally {
        setOtp('')
      }
    })
  }

  const resend = () => run(() => api.post(`/retailer/verifications/${session.id}/aadhaar/resend`, { aadhaar: aadhaarRef.current }))
  const cancel = () => run(() => api.post(`/retailer/verifications/${session.id}/cancel`))

  const reset = () => {
    aadhaarRef.current = ''
    setForm({ ...EMPTY, purpose: options.purposes[0]?.value ?? '' })
    setSession(null)
    setOtp('')
    setErrors({})
    setError(null)
  }

  if (done) return <ResultPanel result={session} onReset={reset} />

  const errorBox = error && (
    <div className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700 dark:bg-red-950 dark:text-red-300">
      {error.text}{' '}
      {error.noBalance && <Link to="/retailer/wallet" className="font-semibold underline">Add money</Link>}
    </div>
  )

  /* ---------- OTP typed by the customer ---------- */
  if (open) {
    return (
      <form onSubmit={verify} className="max-w-xl space-y-4" autoComplete="off">
        <p className="text-sm text-slate-600 dark:text-slate-300">
          An OTP was sent to the mobile number linked with Aadhaar <span className="font-mono">{session.input_masked}</span>
          {session.customer_name ? ` (${session.customer_name})` : ''}. Ask the customer for the OTP.
        </p>

        {session.dev_mode && (
          <div className="flex gap-2 rounded-lg bg-amber-50 px-3 py-2 text-xs text-amber-800 dark:bg-amber-950 dark:text-amber-200">
            <Info className="mt-0.5 h-3.5 w-3.5 shrink-0" />
            <div>Test mode: the correct OTP is <b>123456</b>.</div>
          </div>
        )}

        {errorBox}

        <Input
          label="OTP"
          value={otp}
          onChange={(e) => setOtp(e.target.value.replace(/\D/g, '').slice(0, 6))}
          error={errors.otp}
          inputMode="numeric"
          placeholder="6 digit OTP"
          autoFocus
          required
        />

        <div className="flex flex-wrap items-center gap-3">
          <button type="submit" disabled={busy || otp.length !== 6} className={primaryBtn}>
            {busy ? 'Please wait...' : `Verify (${formatINR(session.price)})`}
          </button>
          <button type="button" onClick={resend} disabled={busy || cooldown > 0 || session.otp.sends_left <= 0} className={ghostBtn}>
            {cooldown > 0 ? `Resend OTP in ${cooldown}s` : 'Resend OTP'}
          </button>
          <button type="button" onClick={cancel} disabled={busy} className="text-sm font-semibold text-red-600 hover:underline disabled:opacity-50">
            Cancel
          </button>
        </div>
        <p className="text-xs text-slate-400">
          {session.otp.tries_left} {session.otp.tries_left === 1 ? 'try' : 'tries'} left, {session.otp.sends_left} OTP {session.otp.sends_left === 1 ? 'send' : 'sends'} left.
          The amount is held in your wallet and charged only when the check succeeds.
        </p>
      </form>
    )
  }

  /* ---------- Start form ---------- */
  return (
    <form onSubmit={start} className="max-w-xl space-y-4" autoComplete="off">
      {errorBox}

      {options.dev_mode && (
        <div className="flex gap-2 rounded-lg bg-amber-50 px-3 py-2 text-xs text-amber-800 dark:bg-amber-950 dark:text-amber-200">
          <Info className="mt-0.5 h-3.5 w-3.5 shrink-0" />
          <div>Test mode: use a 12 digit number starting with 2 to 9. Ending 0 = not found, ending 9 = provider down.</div>
        </div>
      )}

      <Input
        label="Aadhaar number"
        value={form.aadhaar}
        onChange={(e) => setForm({ ...form, aadhaar: e.target.value.replace(/\D/g, '').slice(0, 12) })}
        error={errors.aadhaar}
        inputMode="numeric"
        placeholder="12 digits"
        required
      />
      <Input
        label="Customer name"
        value={form.customer_name}
        onChange={(e) => setForm({ ...form, customer_name: e.target.value })}
        error={errors.customer_name}
        placeholder="Name of the customer"
        required
      />
      <div>
        <label className="mb-1.5 block text-xs font-semibold text-slate-600 dark:text-slate-300">Purpose</label>
        <select value={form.purpose} onChange={(e) => setForm({ ...form, purpose: e.target.value })} className={inputClass}>
          {options.purposes.map((p) => (
            <option key={p.value} value={p.value}>{p.label}</option>
          ))}
        </select>
        {errors.purpose && <p className="mt-1 text-xs text-red-600">{errors.purpose}</p>}
      </div>

      <ConsentBox
        consent={options.consent.AADHAAR}
        vars={{ customer_name: form.customer_name.trim(), retailer: options.retailer, purpose: purposeLabel }}
        checked={form.consent}
        onChange={(consent) => setForm({ ...form, consent })}
        error={errors.consent}
      />

      <button type="submit" disabled={busy || !form.consent || lowBalance || form.aadhaar.length !== 12} className={primaryBtn}>
        {busy ? 'Sending OTP...' : `Send OTP (${formatINR(service.price)})`}
      </button>
      {lowBalance && (
        <p className="text-xs text-red-600">
          Your wallet balance is low. <Link to="/retailer/wallet" className="font-semibold underline">Add money</Link>
        </p>
      )}
      <p className="text-xs text-slate-400">
        The OTP must be completed within {options.ttl_minutes.AADHAAR} minutes. The Aadhaar number is not stored.
      </p>
    </form>
  )
}
