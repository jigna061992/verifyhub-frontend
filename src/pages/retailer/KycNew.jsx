import { useEffect, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { ArrowLeft, ShieldCheck, Wallet, Clock } from 'lucide-react'
import api from '../../api/axios'
import Card from '../../components/ui/Card'
import Input, { inputClass } from '../../components/ui/Input'
import { formatINR } from '../../utils/format'
import { getErrorMessage, getFieldErrors } from '../../utils/errors'

export default function KycNew() {
  const navigate = useNavigate()

  const [options, setOptions] = useState(null)
  const [loadError, setLoadError] = useState('')
  const [form, setForm] = useState({ customer_name: '', customer_mobile: '', purpose: '', consent: false })
  const [errors, setErrors] = useState({})
  const [formError, setFormError] = useState('')
  const [submitting, setSubmitting] = useState(false)

  useEffect(() => {
    api
      .get('/retailer/kyc/options')
      .then((res) => {
        setOptions(res.data)
        setForm((f) => ({ ...f, purpose: res.data.purposes[0]?.value ?? '' }))
      })
      .catch((err) => setLoadError(getErrorMessage(err, 'Unable to load KYC options.')))
  }, [])

  if (loadError) return <p className="text-red-600">{loadError}</p>
  if (!options) return <p className="text-slate-500">Loading...</p>

  const purposeLabel = options.purposes.find((p) => p.value === form.purpose)?.label ?? ''
  const lowBalance = options.price !== null && options.wallet_available < options.price

  // The same text the server saves in the consent log, with the typed values filled in
  const consentPreview = options.consent.text
    .replaceAll('{customer_name}', form.customer_name.trim() || 'the customer')
    .replaceAll('{retailer}', 'the retailer')
    .replaceAll('{purpose}', purposeLabel || 'KYC')

  const submit = async (e) => {
    e.preventDefault()
    if (submitting) return

    setErrors({})
    setFormError('')
    setSubmitting(true)

    try {
      const res = await api.post('/retailer/kyc', form)
      navigate(`/retailer/kyc/${res.data.id}`, { replace: true })
    } catch (err) {
      const fieldErrors = getFieldErrors(err)
      setErrors(fieldErrors)
      if (Object.keys(fieldErrors).length === 0) setFormError(getErrorMessage(err))
      setSubmitting(false)
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <Link to="/retailer/kyc" className="mb-2 inline-flex items-center gap-1 text-sm text-slate-500 hover:text-slate-800 dark:text-slate-400">
          <ArrowLeft className="h-4 w-4" /> Back
        </Link>
        <h1 className="text-2xl font-bold text-slate-900 dark:text-white">Start new KYC</h1>
        <p className="text-sm text-slate-500 dark:text-slate-400">Enter the customer details and get their consent.</p>
      </div>

      {!options.available && (
        <Card>
          <p className="py-6 text-center text-sm text-slate-500">Complete KYC is not available right now.</p>
        </Card>
      )}

      {options.available && (
        <div className="grid gap-6 lg:grid-cols-3">
          <Card title="Customer" className="lg:col-span-2">
            <form onSubmit={submit} className="space-y-4" autoComplete="off">
              {formError && (
                <div className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700 dark:bg-red-950 dark:text-red-300">
                  {formError}{' '}
                  {formError.includes('Insufficient') && (
                    <Link to="/retailer/wallet" className="font-semibold underline">Add money</Link>
                  )}
                </div>
              )}

              <Input
                label="Customer name"
                value={form.customer_name}
                onChange={(e) => setForm({ ...form, customer_name: e.target.value })}
                error={errors.customer_name}
                placeholder="As on Aadhaar"
                required
              />

              <div className="grid gap-4 sm:grid-cols-2">
                <Input
                  label="Customer mobile"
                  value={form.customer_mobile}
                  onChange={(e) => setForm({ ...form, customer_mobile: e.target.value.replace(/\D/g, '').slice(0, 10) })}
                  error={errors.customer_mobile}
                  inputMode="numeric"
                  placeholder="10 digit number"
                  required
                />
                <div>
                  <label className="mb-1.5 block text-xs font-semibold text-slate-600 dark:text-slate-300">Purpose</label>
                  <select
                    value={form.purpose}
                    onChange={(e) => setForm({ ...form, purpose: e.target.value })}
                    className={inputClass}
                  >
                    {options.purposes.map((p) => (
                      <option key={p.value} value={p.value}>{p.label}</option>
                    ))}
                  </select>
                  {errors.purpose && <p className="mt-1 text-xs text-red-600">{errors.purpose}</p>}
                </div>
              </div>

              <div className="rounded-xl border border-slate-200 bg-slate-50 p-4 dark:border-slate-700 dark:bg-slate-800">
                <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">
                  Customer consent ({options.consent.version})
                </p>
                <p className="text-sm leading-relaxed text-slate-700 dark:text-slate-200">{consentPreview}</p>
              </div>

              <label className="flex cursor-pointer items-start gap-3 text-sm text-slate-700 dark:text-slate-200">
                <input
                  type="checkbox"
                  checked={form.consent}
                  onChange={(e) => setForm({ ...form, consent: e.target.checked })}
                  className="mt-0.5 h-4 w-4 rounded border-slate-300 accent-brand-600"
                />
                <span>The customer has read the consent above and agreed to it. I confirm this on their behalf.</span>
              </label>
              {errors.consent && <p className="text-xs text-red-600">{errors.consent}</p>}

              <button
                type="submit"
                disabled={submitting || !form.consent || lowBalance}
                className="rounded-xl bg-brand-700 px-5 py-2.5 text-sm font-semibold text-white hover:bg-brand-800 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {submitting ? 'Starting...' : `Start KYC (${formatINR(options.price)})`}
              </button>
            </form>
          </Card>

          <div className="space-y-4">
            <Card title="How it works">
              <ol className="space-y-3 text-sm text-slate-600 dark:text-slate-300">
                {options.steps.map((s, i) => (
                  <li key={s.step} className="flex items-center gap-3">
                    <span className="flex h-6 w-6 items-center justify-center rounded-full bg-brand-50 text-xs font-bold text-brand-700 dark:bg-brand-950 dark:text-brand-300">
                      {i + 1}
                    </span>
                    {s.label}
                  </li>
                ))}
              </ol>
            </Card>

            <Card>
              <div className="space-y-3 text-sm">
                <div className="flex items-center justify-between">
                  <span className="flex items-center gap-2 text-slate-500"><ShieldCheck className="h-4 w-4" /> Bundle price</span>
                  <span className="font-bold text-slate-900 dark:text-white">{formatINR(options.price)}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="flex items-center gap-2 text-slate-500"><Wallet className="h-4 w-4" /> Wallet balance</span>
                  <span className={`font-bold ${lowBalance ? 'text-red-600' : 'text-slate-900 dark:text-white'}`}>
                    {formatINR(options.wallet_available)}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="flex items-center gap-2 text-slate-500"><Clock className="h-4 w-4" /> Time to finish</span>
                  <span className="font-bold text-slate-900 dark:text-white">{options.ttl_minutes} min</span>
                </div>
              </div>

              {lowBalance && (
                <p className="mt-3 text-xs text-red-600">
                  Your balance is lower than the price.{' '}
                  <Link to="/retailer/wallet" className="font-semibold underline">Add money</Link>
                </p>
              )}

              <p className="mt-4 text-xs text-slate-400">
                The price is held in your wallet while the KYC is in progress. You are charged only when all 4 steps are
                completed. If it fails, is cancelled or expires, the full amount comes back.
              </p>
            </Card>
          </div>
        </div>
      )}
    </div>
  )
}
