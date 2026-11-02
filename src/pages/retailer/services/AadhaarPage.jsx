import { useEffect, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import { Info, Send, Loader2 } from 'lucide-react'
import api from '../../../api/axios'
import Input, { inputClass } from '../../../components/ui/Input'
import { formatINR } from '../../../utils/format'
import { getErrorMessage, getFieldErrors } from '../../../utils/errors'
import { isAadhaar, nameError } from '../../../utils/validators'
import ConsentCheck from './ConsentCheck'
import ResultCard from './ResultCard'
import ServiceShell from './ServiceShell'
import useService from './useService'
import { primaryBtn, ghostBtn, chipBtn } from './helpers'

const EMPTY = { aadhaar: '', customer_name: '', purpose: '', consent: false }
const spaced = (v) => v.replace(/(\d{4})(?=\d)/g, '$1 ') // 1234 5678 9012

// Aadhaar (OTP): send OTP -> customer tells the OTP -> verify
export default function AadhaarPage() {
  const { info, recent, state, reload } = useService('AADHAAR')

  const [form, setForm] = useState(EMPTY)
  const [touched, setTouched] = useState({})
  const [session, setSession] = useState(null)
  const [otp, setOtp] = useState('')
  const [serverErrors, setServerErrors] = useState({})
  const [error, setError] = useState(null) // { text, noBalance }
  const [busy, setBusy] = useState(false)
  const [cooldown, setCooldown] = useState(0)
  const [balance, setBalance] = useState(0)

  // The Aadhaar number lives only in this variable while the check is open. It is needed again only to resend the OTP.
  const aadhaarRef = useRef('')

  useEffect(() => {
    if (!info) return
    setBalance(info.wallet_available)
    setForm((f) => (f.purpose ? f : { ...f, purpose: info.purposes[0]?.value ?? '' }))
  }, [info])

  useEffect(() => setCooldown(session?.otp?.cooldown_left ?? 0), [session])

  useEffect(() => {
    if (cooldown <= 0) return undefined
    const timer = setTimeout(() => setCooldown((c) => c - 1), 1000)
    return () => clearTimeout(timer)
  }, [cooldown])

  if (state === 'loading') return <p className="text-slate-500">Loading...</p>
  if (state === 'unavailable') return <p className="text-slate-600 dark:text-slate-300">Aadhaar verification is not enabled for your account. Please contact the admin.</p>
  if (state === 'error') return <p className="text-red-600">Unable to load this page. Please refresh.</p>

  const open = session?.status === 'pending'
  const done = session && session.status !== 'pending'
  const purposeLabel = info.purposes.find((p) => p.value === form.purpose)?.label ?? ''
  const lowBalance = balance < info.price

  // Quick checks shown under the field after it is touched (or after a submit try)
  const clientErrors = {
    aadhaar: !form.aadhaar ? 'Aadhaar number is required.' : !isAadhaar(form.aadhaar) ? 'Enter a 12 digit Aadhaar number (starts with 2 to 9).' : null,
    customer_name: nameError(form.customer_name, { required: true }),
    consent: form.consent ? null : 'Consent is required.',
  }
  const shown = (key) => serverErrors[key] || (touched[key] ? clientErrors[key] : null)
  const valid = !clientErrors.aadhaar && !clientErrors.customer_name && !clientErrors.consent
  const touch = (key) => () => setTouched((t) => ({ ...t, [key]: true }))

  const apply = (data) => {
    setSession(data)
    if (data.wallet_available !== undefined) setBalance(data.wallet_available)
    if (data.status !== 'pending') {
      aadhaarRef.current = ''
      reload()
    }
  }

  const run = async (call) => {
    if (busy) return
    setBusy(true)
    setServerErrors({})
    setError(null)
    try {
      apply((await call()).data)
    } catch (err) {
      const fieldErrors = getFieldErrors(err)
      setServerErrors(fieldErrors)
      if (Object.keys(fieldErrors).length === 0) {
        setError({ text: getErrorMessage(err), noBalance: err?.response?.data?.code === 'insufficient_balance' })
      }
      // The check was closed meanwhile (expired, cancelled): show its final state
      if (['closed', 'expired'].includes(err?.response?.data?.code) && session) {
        api.get(`/retailer/verifications/${session.id}`).then((res) => apply(res.data)).catch(() => {})
      }
    } finally {
      setBusy(false)
    }
  }

  const start = (e) => {
    e.preventDefault()
    setTouched({ aadhaar: true, customer_name: true, consent: true })
    if (!valid) return
    aadhaarRef.current = form.aadhaar
    run(() => api.post('/retailer/verifications/aadhaar', { ...form, customer_name: form.customer_name.trim() }))
  }

  const verify = (e) => {
    e.preventDefault()
    run(async () => {
      try {
        return await api.post(`/retailer/verifications/${session.id}/aadhaar/verify`, { otp })
      } finally {
        setOtp('')
      }
    })
  }

  const resend = () => run(() => api.post(`/retailer/verifications/${session.id}/aadhaar/resend`, { aadhaar: aadhaarRef.current }))
  const cancel = () => run(() => api.post(`/retailer/verifications/${session.id}/cancel`))

  const clear = () => {
    aadhaarRef.current = ''
    setForm({ ...EMPTY, purpose: info.purposes[0]?.value ?? '' })
    setTouched({})
    setServerErrors({})
    setError(null)
    setSession(null)
    setOtp('')
  }

  const errorBox = error && (
    <div className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700 dark:bg-red-950 dark:text-red-300">
      {error.text}{' '}
      {error.noBalance && <Link to="/retailer/wallet" className="font-semibold underline">Add money</Link>}
    </div>
  )

  /* ---------- right side: OTP step or the final result ---------- */
  let result = null
  if (done) result = <ResultCard result={session} onReset={clear} />

  if (open) {
    result = (
      <form onSubmit={verify} className="space-y-4" autoComplete="off">
        <div>
          <div className="font-semibold text-slate-900 dark:text-white">Enter the OTP</div>
          <p className="mt-1 text-sm text-slate-600 dark:text-slate-300">
            An OTP was sent to the mobile linked with Aadhaar <span className="font-mono">{session.input_masked}</span>
            {session.customer_name ? ` (${session.customer_name})` : ''}. Ask the customer for it.
          </p>
        </div>

        {session.dev_otp && (
          <div className="flex items-center gap-2 rounded-lg bg-amber-50 px-3 py-2 text-xs text-amber-800 dark:bg-amber-950 dark:text-amber-200">
            <Info className="h-3.5 w-3.5 shrink-0" />
            <span>Test mode: the OTP is <b className="font-mono">{session.dev_otp}</b></span>
            <button type="button" onClick={() => setOtp(session.dev_otp)} className="ml-auto font-semibold underline">Use it</button>
          </div>
        )}

        {errorBox}

        <Input
          label="6 digit OTP"
          value={otp}
          onChange={(e) => setOtp(e.target.value.replace(/\D/g, '').slice(0, 6))}
          error={serverErrors.otp}
          inputMode="numeric"
          autoFocus
          required
        />

        <div className="flex flex-wrap items-center gap-3">
          <button type="submit" disabled={busy || otp.length !== 6} className={primaryBtn}>
            {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : null} Verify ({formatINR(session.price)})
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

  return (
    <ServiceShell
      info={info}
      balance={balance}
      recent={recent}
      title="Aadhaar Verification (OTP)"
      subtitle="Authenticate the customer with an OTP sent to their Aadhaar-linked mobile."
      docLabel="Document"
      result={result}
      resultHint="Submit the details and enter the OTP. The result will appear here."
      note="The full Aadhaar number is never stored. Only the last 4 digits are kept, as required for Aadhaar data handling."
    >
      <form onSubmit={start} className="space-y-4" autoComplete="off">
        {!open && errorBox}

        <Input
          label={<>Aadhaar number <span className="text-red-500">*</span></>}
          value={spaced(form.aadhaar)}
          onChange={(e) => setForm({ ...form, aadhaar: e.target.value.replace(/\D/g, '').slice(0, 12) })}
          onBlur={touch('aadhaar')}
          error={shown('aadhaar')}
          hint="12 digits. Only the last 4 digits are kept."
          inputMode="numeric"
          placeholder="XXXX XXXX XXXX"
          disabled={open || busy}
        />

        <Input
          label={<>Customer name <span className="text-red-500">*</span></>}
          value={form.customer_name}
          onChange={(e) => setForm({ ...form, customer_name: e.target.value })}
          onBlur={touch('customer_name')}
          error={shown('customer_name')}
          hint="Used in the consent letter and to match with the name on Aadhaar."
          placeholder="Full name"
          disabled={open || busy}
        />

        <div>
          <label className="mb-1.5 block text-xs font-semibold text-slate-600 dark:text-slate-300">Purpose</label>
          <select value={form.purpose} onChange={(e) => setForm({ ...form, purpose: e.target.value })} className={inputClass} disabled={open || busy}>
            {info.purposes.map((p) => <option key={p.value} value={p.value}>{p.label}</option>)}
          </select>
          {serverErrors.purpose && <p className="mt-1 text-xs text-red-600">{serverErrors.purpose}</p>}
        </div>

        {info.samples.length > 0 && !open && (
          <div className="flex flex-wrap items-center gap-2 text-xs text-slate-500">
            Try sample:
            {info.samples.map((s) => (
              <button key={s.label} type="button" className={chipBtn} onClick={() => setForm({ ...form, ...s.values })}>{s.label}</button>
            ))}
          </div>
        )}

        <ConsentCheck
          consent={info.consent}
          vars={{ customer_name: form.customer_name.trim(), retailer: info.retailer, purpose: purposeLabel }}
          checked={form.consent}
          disabled={open}
          onChange={(consent) => { setForm({ ...form, consent }); setTouched((t) => ({ ...t, consent: true })) }}
          error={shown('consent')}
        />

        <div className="flex items-center justify-end gap-3">
          <button type="button" onClick={clear} disabled={busy} className="px-3 text-sm font-semibold text-slate-600 hover:text-slate-900 dark:text-slate-300">Clear</button>
          <button type="submit" disabled={busy || open || !form.consent || lowBalance} className={primaryBtn}>
            {busy && !open ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
            {busy && !open ? 'Sending OTP...' : 'Send Aadhaar OTP'}
          </button>
        </div>

        {lowBalance && !open && (
          <p className="text-xs text-red-600">
            Your wallet balance is low. <Link to="/retailer/wallet" className="font-semibold underline">Add money</Link>
          </p>
        )}
        <p className="text-xs text-slate-400">The OTP must be completed within {info.ttl_minutes} minutes.</p>
      </form>
    </ServiceShell>
  )
}
