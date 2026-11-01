import { useCallback, useEffect, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import {
  ArrowLeft, CheckCircle2, XCircle, Loader2, Clock, Fingerprint, IdCard, Landmark, FileSignature, Info,
} from 'lucide-react'
import api from '../../api/axios'
import Card from '../../components/ui/Card'
import Input from '../../components/ui/Input'
import StatusBadge from '../../components/ui/StatusBadge'
import DownloadButton from '../../components/ui/DownloadButton'
import { formatINR } from '../../utils/format'
import { getErrorMessage, getFieldErrors } from '../../utils/errors'

const ICONS = { aadhaar: Fingerprint, pan: IdCard, bank: Landmark, esign: FileSignature }

const primaryBtn =
  'rounded-xl bg-brand-700 px-5 py-2.5 text-sm font-semibold text-white hover:bg-brand-800 disabled:cursor-not-allowed disabled:opacity-50'
const ghostBtn =
  'rounded-xl border border-slate-300 px-5 py-2.5 text-sm font-semibold text-slate-700 hover:bg-slate-50 disabled:opacity-50 dark:border-slate-700 dark:text-slate-200 dark:hover:bg-slate-800'

const prettyKey = (key) => key.replace(/_/g, ' ').replace(/^\w/, (c) => c.toUpperCase())

const formatDateTime = (iso) =>
  new Date(iso).toLocaleString('en-IN', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' })

/* ---------- small pieces ---------- */

function DevHint({ children }) {
  return (
    <div className="flex gap-2 rounded-lg bg-amber-50 px-3 py-2 text-xs text-amber-800 dark:bg-amber-950 dark:text-amber-200">
      <Info className="mt-0.5 h-3.5 w-3.5 shrink-0" />
      <div>{children}</div>
    </div>
  )
}

function StepProblem({ step }) {
  if (!step.failure_reason) return null
  return (
    <div className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700 dark:bg-red-950 dark:text-red-300">
      {step.failure_reason}{' '}
      <span className="text-xs opacity-80">
        ({step.attempts_left} {step.attempts_left === 1 ? 'try' : 'tries'} left)
      </span>
    </div>
  )
}

function StepIcon({ status }) {
  if (status === 'success') return <CheckCircle2 className="h-5 w-5 text-emerald-600" />
  if (status === 'failed') return <XCircle className="h-5 w-5 text-red-600" />
  if (status === 'processing') return <Loader2 className="h-5 w-5 animate-spin text-brand-600" />
  if (status === 'awaiting') return <Clock className="h-5 w-5 text-amber-500" />
  return <span className="h-5 w-5 rounded-full border-2 border-slate-300 dark:border-slate-600" />
}

/* ---------- step panels ---------- */

function AadhaarPanel({ step, busy, run, resend, dev, devOtp }) {
  const [aadhaar, setAadhaar] = useState('')
  const [otp, setOtp] = useState('')
  const [errors, setErrors] = useState({})
  const [resending, setResending] = useState(false)

  const otpPhase = step.status === 'awaiting' && !resending

  const sendOtp = async (e) => {
    e.preventDefault()
    const r = await run('aadhaar/otp', { aadhaar_number: aadhaar })
    setErrors(r.errors)
    if (r.ok) {
      setAadhaar('') // the Aadhaar number is not kept on screen after it is sent
      setResending(false)
      setOtp('')
    }
  }

  const verifyOtp = async (e) => {
    e.preventDefault()
    const r = await run('aadhaar/verify', { otp })
    setErrors(r.errors)
    if (r.ok) setOtp('')
  }

  return (
    <div className="max-w-md space-y-4">
      <StepProblem step={step} />

      {otpPhase ? (
        <form onSubmit={verifyOtp} className="space-y-4" autoComplete="off">
          <p className="text-sm text-slate-600 dark:text-slate-300">
            An OTP was sent to the mobile number linked with Aadhaar ({step.input_masked}). Ask the customer for it.
          </p>
          <Input
            label="OTP"
            value={otp}
            onChange={(e) => setOtp(e.target.value.replace(/\D/g, '').slice(0, 6))}
            error={errors.otp}
            inputMode="numeric"
            placeholder="6 digit OTP"
            required
          />
          <div className="flex flex-wrap items-center gap-3">
            <button type="submit" disabled={busy || otp.length !== 6} className={primaryBtn}>
              {busy ? 'Verifying...' : 'Verify OTP'}
            </button>
            <button
              type="button"
              disabled={busy || resend > 0 || step.otp_sends_left === 0}
              onClick={() => setResending(true)}
              className="text-sm font-semibold text-brand-700 hover:underline disabled:cursor-not-allowed disabled:opacity-50 disabled:no-underline dark:text-brand-300"
            >
              {step.otp_sends_left === 0
                ? 'No more OTPs allowed'
                : resend > 0
                  ? `Resend OTP in ${resend}s`
                  : 'Resend OTP'}
            </button>
          </div>
          {dev && (
            <DevHint>
              Test mode: no real SMS is sent.{' '}
              {devOtp ? (
                <>The OTP is <b>{devOtp}</b>.</>
              ) : (
                <>Find the OTP in <b>storage/logs/laravel.log</b> (search "MOCK SMS").</>
              )}
            </DevHint>
          )}
        </form>
      ) : (
        <form onSubmit={sendOtp} className="space-y-4" autoComplete="off">
          <Input
            label="Aadhaar number"
            value={aadhaar}
            onChange={(e) => setAadhaar(e.target.value.replace(/\D/g, '').slice(0, 12))}
            error={errors.aadhaar_number}
            inputMode="numeric"
            placeholder="12 digit Aadhaar number"
            hint="Used only to send the OTP. It is not saved."
            required
          />
          <div className="flex items-center gap-3">
            <button type="submit" disabled={busy || aadhaar.length !== 12} className={primaryBtn}>
              {busy ? 'Sending...' : 'Send OTP'}
            </button>
            {resending && (
              <button type="button" onClick={() => setResending(false)} className="text-sm text-slate-500 hover:underline">
                Back
              </button>
            )}
          </div>
          {dev && (
            <DevHint>
              Test mode: any number starting with 2-9 works. Ending in <b>0</b> = not found, ending in <b>9</b> = provider down.
            </DevHint>
          )}
        </form>
      )}
    </div>
  )
}

function PanPanel({ step, busy, run, dev }) {
  const [pan, setPan] = useState('')
  const [errors, setErrors] = useState({})

  const submit = async (e) => {
    e.preventDefault()
    const r = await run('pan', { pan })
    setErrors(r.errors)
  }

  return (
    <form onSubmit={submit} className="max-w-md space-y-4" autoComplete="off">
      <StepProblem step={step} />
      <Input
        label="PAN number"
        value={pan}
        onChange={(e) => setPan(e.target.value.toUpperCase().replace(/\s/g, '').slice(0, 10))}
        error={errors.pan}
        placeholder="ABCDE1234F"
        required
      />
      <button type="submit" disabled={busy || pan.length !== 10} className={primaryBtn}>
        {busy ? 'Verifying...' : 'Verify PAN'}
      </button>
      <p className="text-xs text-slate-400">The name on the PAN must match the name on Aadhaar, and the PAN must be linked with Aadhaar.</p>
      {dev && (
        <DevHint>
          Test mode: last letter <b>Z</b> = invalid, <b>E</b> = provider down, <b>M</b> = different name, <b>L</b> = not linked.
        </DevHint>
      )}
    </form>
  )
}

function BankPanel({ step, busy, run, dev }) {
  const [form, setForm] = useState({ account_number: '', ifsc: '' })
  const [errors, setErrors] = useState({})

  const submit = async (e) => {
    e.preventDefault()
    const r = await run('bank', form)
    setErrors(r.errors)
  }

  return (
    <form onSubmit={submit} className="max-w-md space-y-4" autoComplete="off">
      <StepProblem step={step} />
      <Input
        label="Account number"
        value={form.account_number}
        onChange={(e) => setForm({ ...form, account_number: e.target.value.replace(/\D/g, '').slice(0, 18) })}
        error={errors.account_number}
        inputMode="numeric"
        placeholder="9 to 18 digits"
        required
      />
      <Input
        label="IFSC code"
        value={form.ifsc}
        onChange={(e) => setForm({ ...form, ifsc: e.target.value.toUpperCase().replace(/\s/g, '').slice(0, 11) })}
        error={errors.ifsc}
        placeholder="SBIN0001234"
        required
      />
      <button
        type="submit"
        disabled={busy || form.account_number.length < 9 || form.ifsc.length !== 11}
        className={primaryBtn}
      >
        {busy ? 'Verifying...' : 'Verify bank account'}
      </button>
      <p className="text-xs text-slate-400">A small test amount is sent to the account. The account holder name must match Aadhaar.</p>
      {dev && (
        <DevHint>
          Test mode: account ending in <b>0</b> = invalid, <b>9</b> = provider down, <b>7</b> = different name.
        </DevHint>
      )}
    </form>
  )
}

function EsignPanel({ step, busy, run, dev }) {
  const waiting = step.status === 'awaiting'

  return (
    <div className="max-w-md space-y-4">
      <StepProblem step={step} />

      {!waiting && (
        <>
          <p className="text-sm text-slate-600 dark:text-slate-300">
            A consent letter with the verified (masked) details is prepared and sent to the customer for e-Sign.
          </p>
          <button onClick={() => run('esign/start')} disabled={busy} className={primaryBtn}>
            {busy ? 'Starting...' : 'Start e-Sign'}
          </button>
        </>
      )}

      {waiting && (
        <>
          <div className="flex items-start gap-3 rounded-xl bg-amber-50 p-4 dark:bg-amber-950">
            <Loader2 className="mt-0.5 h-5 w-5 shrink-0 animate-spin text-amber-600" />
            <div className="text-sm text-slate-700 dark:text-slate-200">
              <div className="font-semibold">Waiting for the customer to sign</div>
              <div className="text-xs opacity-80">This page updates by itself when the customer has signed.</div>
              {step.sign_url && (
                <a href={step.sign_url} target="_blank" rel="noreferrer" className="mt-2 inline-block font-semibold text-brand-700 underline dark:text-brand-300">
                  Open signing page
                </a>
              )}
            </div>
          </div>

          {dev && (
            <div className="space-y-2">
              <DevHint>Test mode: there is no real signing page. Use these buttons to act as the customer.</DevHint>
              <div className="flex gap-3">
                <button onClick={() => run('esign/simulate', { outcome: 'signed' })} disabled={busy} className={primaryBtn}>
                  Customer signs
                </button>
                <button onClick={() => run('esign/simulate', { outcome: 'declined' })} disabled={busy} className={ghostBtn}>
                  Customer declines
                </button>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  )
}

/* ---------- final result ---------- */

function FinalPanel({ kyc }) {
  const done = kyc.status === 'completed'
  const [pdfError, setPdfError] = useState('')

  return (
    <div className="space-y-5">
      <div className={`flex items-start gap-3 rounded-xl p-4 ${done ? 'bg-emerald-50 dark:bg-emerald-950' : 'bg-red-50 dark:bg-red-950'}`}>
        {done ? <CheckCircle2 className="mt-0.5 h-6 w-6 text-emerald-600" /> : <XCircle className="mt-0.5 h-6 w-6 text-red-600" />}
        <div>
          <div className="font-semibold text-slate-900 dark:text-white">
            {done ? 'KYC completed' : `KYC ${kyc.status.replace('_', ' ')}`}
          </div>
          <div className="text-sm text-slate-600 dark:text-slate-300">
            {done ? `${formatINR(kyc.charged)} charged to your wallet.` : kyc.failure_reason}
          </div>
        </div>
      </div>

      {done && (
        <div>
          <div className="flex flex-col gap-3 sm:flex-row">
            <DownloadButton
              url={`/retailer/kyc/${kyc.id}/report`}
              filename="kyc-report.pdf"
              label="KYC report (PDF)"
              onError={setPdfError}
            />
            <DownloadButton
              url={`/retailer/kyc/${kyc.id}/consent`}
              filename="signed-consent.pdf"
              label="Signed consent (PDF)"
              onError={setPdfError}
            />
          </div>
          {pdfError && <p className="mt-2 text-sm text-red-600">{pdfError}</p>}
        </div>
      )}

      {done && (
        <div className="space-y-4">
          {kyc.steps.map((s) => (
            <div key={s.step}>
              <div className="mb-1 text-xs font-semibold uppercase tracking-wide text-slate-400">{s.label}</div>
              <dl className="divide-y divide-slate-100 text-sm dark:divide-slate-800">
                {s.input_masked && (
                  <div className="flex justify-between py-1.5">
                    <dt className="text-slate-500">Checked</dt>
                    <dd className="font-mono text-slate-800 dark:text-slate-100">{s.input_masked}</dd>
                  </div>
                )}
                {s.result &&
                  Object.entries(s.result).map(([key, value]) => (
                    <div key={key} className="flex justify-between gap-4 py-1.5">
                      <dt className="text-slate-500">{prettyKey(key)}</dt>
                      <dd className="break-all text-right font-semibold text-slate-800 dark:text-slate-100">{String(value)}</dd>
                    </div>
                  ))}
              </dl>
            </div>
          ))}
        </div>
      )}

      <Link to="/retailer/kyc/new" className={`${primaryBtn} inline-block`}>
        Start another KYC
      </Link>
    </div>
  )
}

/* ---------- page ---------- */

export default function KycCase() {
  const { id } = useParams()

  const [kyc, setKyc] = useState(null)
  const [loadError, setLoadError] = useState('')
  const [busy, setBusy] = useState(false)
  const [notice, setNotice] = useState('')
  const [resend, setResend] = useState(0)
  const [devOtp, setDevOtp] = useState('') // test mode only: the OTP the server made, shown once

  const load = useCallback(async () => {
    try {
      const res = await api.get(`/retailer/kyc/${id}`)
      setKyc(res.data)
      setLoadError('')
    } catch (err) {
      setLoadError(getErrorMessage(err, 'Unable to load this KYC.'))
    }
  }, [id])

  useEffect(() => {
    load()
  }, [load])

  const open = kyc?.status === 'in_progress'
  const aadhaar = kyc?.steps.find((s) => s.step === 'aadhaar')
  const esignStatus = kyc?.steps.find((s) => s.step === 'esign')?.status

  // While the customer is signing, check for the result every 4 seconds
  useEffect(() => {
    if (!open || esignStatus !== 'awaiting') return
    const timer = setInterval(load, 4000)
    return () => clearInterval(timer)
  }, [open, esignStatus, load])

  // OTP resend countdown (the server sends the seconds left)
  useEffect(() => {
    setResend(aadhaar?.otp_resend_in ?? 0)
  }, [aadhaar?.otp_resend_in, aadhaar?.status])

  useEffect(() => {
    if (resend <= 0) return
    const timer = setTimeout(() => setResend((r) => r - 1), 1000)
    return () => clearTimeout(timer)
  }, [resend])

  // One helper for every action. Returns { ok, errors } so a panel can show field errors.
  const run = async (path, body = {}) => {
    if (busy) return { ok: false, errors: {} }
    setBusy(true)
    setNotice('')

    try {
      const res = await api.post(`/retailer/kyc/${id}/${path}`, body)
      setKyc(res.data)
      if (res.data.dev_otp) setDevOtp(res.data.dev_otp)
      return { ok: true, errors: {} }
    } catch (err) {
      const errors = getFieldErrors(err)
      if (Object.keys(errors).length === 0) setNotice(getErrorMessage(err))
      // The case may have changed on the server (expired, already finished...), so refresh it
      if (err?.response?.status === 409) load()
      return { ok: false, errors }
    } finally {
      setBusy(false)
    }
  }

  const cancel = async () => {
    if (!window.confirm('Cancel this KYC? The amount held in your wallet will be returned.')) return
    await run('cancel')
  }

  if (loadError) {
    return (
      <div className="space-y-3">
        <p className="text-red-600">{loadError}</p>
        <Link to="/retailer/kyc" className="text-sm font-semibold text-brand-700 underline">Back to KYC list</Link>
      </div>
    )
  }

  if (!kyc) return <p className="text-slate-500">Loading...</p>

  const current = kyc.steps.find((s) => s.step === kyc.current_step)
  const panelProps = { step: current, busy, run, resend, dev: kyc.dev_mode, devOtp }

  return (
    <div className="space-y-6">
      <div>
        <Link to="/retailer/kyc" className="mb-2 inline-flex items-center gap-1 text-sm text-slate-500 hover:text-slate-800 dark:text-slate-400">
          <ArrowLeft className="h-4 w-4" /> All KYC
        </Link>

        <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-start">
          <div>
            <div className="flex items-center gap-3">
              <h1 className="text-2xl font-bold text-slate-900 dark:text-white">{kyc.customer_name}</h1>
              <StatusBadge status={kyc.status} />
            </div>
            <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
              {kyc.customer_mobile_masked} · Bundle price {formatINR(kyc.price)}
              {open && ` · Finish before ${formatDateTime(kyc.expires_at)}`}
            </p>
          </div>

          {open && (
            <button onClick={cancel} disabled={busy} className="text-sm font-semibold text-red-600 hover:underline disabled:opacity-50">
              Cancel KYC
            </button>
          )}
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        {/* Steps */}
        <Card title="Steps">
          <ol className="space-y-1">
            {kyc.steps.map((s, i) => {
              const Icon = ICONS[s.step]
              const active = open && s.step === kyc.current_step
              return (
                <li
                  key={s.step}
                  className={`flex items-center gap-3 rounded-xl px-3 py-3 ${active ? 'bg-brand-50 dark:bg-brand-950' : ''}`}
                >
                  <StepIcon status={s.status} />
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2 text-sm font-semibold text-slate-900 dark:text-white">
                      <Icon className="h-4 w-4 text-slate-400" />
                      {i + 1}. {s.label}
                    </div>
                    {s.input_masked && (
                      <div className="truncate font-mono text-xs text-slate-400">{s.input_masked}</div>
                    )}
                  </div>
                </li>
              )
            })}
          </ol>

          {kyc.consents.length > 0 && (
            <div className="mt-5 border-t border-slate-100 pt-4 dark:border-slate-800">
              <div className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-400">Consent log</div>
              <ul className="space-y-2 text-xs text-slate-500 dark:text-slate-400">
                {kyc.consents.map((c, i) => (
                  <li key={i}>
                    <span className="font-semibold text-slate-700 dark:text-slate-200">
                      {c.type === 'collection' ? 'Consent given' : 'Letter e-Signed'}
                    </span>
                    {' · '}{c.purpose} · {c.text_version}
                    <br />
                    {formatDateTime(c.accepted_at)}
                  </li>
                ))}
              </ul>
            </div>
          )}
        </Card>

        {/* Current step or final result */}
        <Card title={open ? `Step: ${current.label}` : 'Result'} className="lg:col-span-2">
          {notice && (
            <div className="mb-4 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700 dark:bg-red-950 dark:text-red-300">
              {notice}
            </div>
          )}

          {!open && <FinalPanel kyc={kyc} />}

          {open && current.step === 'aadhaar' && <AadhaarPanel key="aadhaar" {...panelProps} />}
          {open && current.step === 'pan' && <PanPanel key="pan" {...panelProps} />}
          {open && current.step === 'bank' && <BankPanel key="bank" {...panelProps} />}
          {open && current.step === 'esign' && <EsignPanel key="esign" {...panelProps} />}
        </Card>
      </div>
    </div>
  )
}
