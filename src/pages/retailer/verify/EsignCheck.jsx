import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { Info, Loader2, Copy } from 'lucide-react'
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

const EMPTY = { customer_name: '', customer_mobile: '', purpose: '', consent: false }

// Stand-alone e-Sign: the customer gets a consent letter and signs it on their phone
export default function EsignCheck({ service, options, balance, onBalance }) {
  const [form, setForm] = useState({ ...EMPTY, purpose: options.purposes[0]?.value ?? '' })
  const [session, setSession] = useState(null)
  const [errors, setErrors] = useState({})
  const [error, setError] = useState(null)
  const [busy, setBusy] = useState(false)
  const [copied, setCopied] = useState(false)

  const open = session?.status === 'pending'
  const done = session && session.status !== 'pending'
  const purposeLabel = options.purposes.find((p) => p.value === form.purpose)?.label ?? ''
  const lowBalance = (balance ?? options.wallet_available) < service.price && session === null

  const apply = (data) => {
    setSession(data)
    if (data.wallet_available !== undefined) onBalance(data.wallet_available)
  }

  // While the customer is signing, ask for the result every 4 seconds
  useEffect(() => {
    if (!open) return undefined
    const id = session.id
    const timer = setInterval(() => {
      api.get(`/retailer/verifications/${id}`).then((res) => apply(res.data)).catch(() => {})
    }, 4000)
    return () => clearInterval(timer)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, session?.id])

  const run = async (call) => {
    if (busy) return
    setBusy(true)
    setErrors({})
    setError(null)
    try {
      apply((await call()).data)
    } catch (err) {
      const fieldErrors = getFieldErrors(err)
      setErrors(fieldErrors)
      if (Object.keys(fieldErrors).length === 0) {
        setError({ text: getErrorMessage(err), noBalance: err?.response?.data?.code === 'insufficient_balance' })
      }
    } finally {
      setBusy(false)
    }
  }

  const start = (e) => {
    e.preventDefault()
    return run(() => api.post('/retailer/verifications/esign', form))
  }
  const simulate = (outcome) => run(() => api.post(`/retailer/verifications/${session.id}/esign/simulate`, { outcome }))
  const cancel = () => run(() => api.post(`/retailer/verifications/${session.id}/cancel`))

  const copyLink = async () => {
    try {
      await navigator.clipboard.writeText(session.sign_url)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch {
      /* clipboard blocked: the link is still visible to select */
    }
  }

  const reset = () => {
    setForm({ ...EMPTY, purpose: options.purposes[0]?.value ?? '' })
    setSession(null)
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

  /* ---------- Waiting for the customer ---------- */
  if (open) {
    return (
      <div className="max-w-xl space-y-4">
        {errorBox}

        <div className="flex items-start gap-3 rounded-xl bg-amber-50 p-4 dark:bg-amber-950">
          <Loader2 className="mt-0.5 h-5 w-5 shrink-0 animate-spin text-amber-600" />
          <div className="text-sm text-slate-700 dark:text-slate-200">
            <div className="font-semibold text-slate-900 dark:text-white">Waiting for the customer to sign</div>
            The consent letter was sent to {session.customer_name} ({session.input_masked}). This page updates by itself.
            {session.expires_at && ` Valid until ${new Date(session.expires_at).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })}.`}
          </div>
        </div>

        {session.sign_url && (
          <div>
            <label className="mb-1.5 block text-xs font-semibold text-slate-600 dark:text-slate-300">Signing link (share with the customer if they did not get it)</label>
            <div className="flex gap-2">
              <input readOnly value={session.sign_url} className={`${inputClass} font-mono text-xs`} />
              <button type="button" onClick={copyLink} className={ghostBtn} aria-label="Copy link">
                <Copy className="h-4 w-4" />
              </button>
            </div>
            {copied && <p className="mt-1 text-xs text-brand-700">Copied.</p>}
          </div>
        )}

        {session.dev_mode && (
          <div className="space-y-2 rounded-lg bg-amber-50 px-3 py-2 text-xs text-amber-800 dark:bg-amber-950 dark:text-amber-200">
            <div className="flex gap-2">
              <Info className="mt-0.5 h-3.5 w-3.5 shrink-0" />
              <div>Test mode: there is no real signing page. Pretend the customer finished:</div>
            </div>
            <div className="flex gap-2">
              <button type="button" disabled={busy} onClick={() => simulate('signed')} className={ghostBtn}>Customer signed</button>
              <button type="button" disabled={busy} onClick={() => simulate('declined')} className={ghostBtn}>Customer declined</button>
            </div>
          </div>
        )}

        <button type="button" onClick={cancel} disabled={busy} className="text-sm font-semibold text-red-600 hover:underline disabled:opacity-50">
          Cancel this check
        </button>
        <p className="text-xs text-slate-400">The amount is held in your wallet and charged only after the customer signs.</p>
      </div>
    )
  }

  /* ---------- Start form ---------- */
  return (
    <form onSubmit={start} className="max-w-xl space-y-4" autoComplete="off">
      {errorBox}

      <Input
        label="Customer name"
        value={form.customer_name}
        onChange={(e) => setForm({ ...form, customer_name: e.target.value })}
        error={errors.customer_name}
        placeholder="Name of the customer"
        required
      />
      <Input
        label="Customer mobile number"
        value={form.customer_mobile}
        onChange={(e) => setForm({ ...form, customer_mobile: e.target.value.replace(/\D/g, '').slice(0, 10) })}
        error={errors.customer_mobile}
        inputMode="numeric"
        placeholder="10 digit mobile"
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
        consent={options.consent.ESIGN}
        vars={{ customer_name: form.customer_name.trim(), retailer: options.retailer, purpose: purposeLabel }}
        checked={form.consent}
        onChange={(consent) => setForm({ ...form, consent })}
        error={errors.consent}
      />

      <button type="submit" disabled={busy || !form.consent || lowBalance || form.customer_mobile.length !== 10} className={primaryBtn}>
        {busy ? 'Sending...' : `Send for e-Sign (${formatINR(service.price)})`}
      </button>
      {lowBalance && (
        <p className="text-xs text-red-600">
          Your wallet balance is low. <Link to="/retailer/wallet" className="font-semibold underline">Add money</Link>
        </p>
      )}
      <p className="text-xs text-slate-400">The customer must sign within {options.ttl_minutes.ESIGN} minutes. The mobile number is not stored.</p>
    </form>
  )
}
