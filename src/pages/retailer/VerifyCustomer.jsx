import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import api from '../../api/axios'
import Card from '../../components/ui/Card'
import Input from '../../components/ui/Input'
import { metaFor } from '../../utils/serviceMeta'
import { formatINR } from '../../utils/format'
import { getErrorMessage, getFieldErrors } from '../../utils/errors'
import ResultPanel from './verify/ResultPanel'
import AadhaarCheck from './verify/AadharCheck'
import EsignCheck from './verify/EsignCheck'

// Input fields of the one-call services. "digits" keeps only numbers, "upper" makes capital letters.
const FIELDS = {
  PAN: [{ key: 'pan', label: 'PAN number', placeholder: 'ABCDE1234F', max: 10, upper: true }],
  BANK: [
    { key: 'account_number', label: 'Account number', placeholder: '9 to 18 digits', max: 18, digits: true },
    { key: 'ifsc', label: 'IFSC code', placeholder: 'SBIN0001234', max: 11, upper: true },
  ],
  GST: [{ key: 'gstin', label: 'GST number', placeholder: '15 character GSTIN', max: 15, upper: true }],
}

export default function VerifyCustomer() {
  const [services, setServices] = useState([])
  const [options, setOptions] = useState(null) // purposes + consent texts for Aadhaar and e-Sign
  const [balance, setBalance] = useState(null)
  const [loadingServices, setLoadingServices] = useState(true)

  const [selected, setSelected] = useState(null)
  const [form, setForm] = useState({})
  const [errors, setErrors] = useState({})
  const [formError, setFormError] = useState(null) // { text, noBalance }
  const [submitting, setSubmitting] = useState(false)
  const [result, setResult] = useState(null)

  useEffect(() => {
    api
      .get('/retailer/services')
      .then((res) => {
        setServices(res.data)
        if (res.data.length > 0) setSelected(res.data[0])
      })
      .catch(() => setFormError({ text: 'Unable to load services.' }))
      .finally(() => setLoadingServices(false))

    api.get('/retailer/wallet').then((res) => setBalance(res.data.available)).catch(() => {})
    api.get('/retailer/verifications/options').then((res) => setOptions(res.data)).catch(() => {})
  }, [])

  const flow = selected?.flow ?? 'instant'
  const fields = selected ? FIELDS[selected.code] || [] : []
  const aadhaar = services.find((s) => s.code === 'AADHAAR')
  const esign = services.find((s) => s.code === 'ESIGN')

  const pick = (service) => {
    setSelected(service)
    setForm({})
    setErrors({})
    setFormError(null)
    setResult(null)
  }

  const onChange = (field) => (e) => {
    let value = e.target.value
    if (field.digits) value = value.replace(/\D/g, '')
    if (field.upper) value = value.toUpperCase().replace(/\s/g, '')
    setForm({ ...form, [field.key]: value.slice(0, field.max) })
  }

  const submit = async (e) => {
    e.preventDefault()
    if (submitting) return

    setErrors({})
    setFormError(null)
    setResult(null)
    setSubmitting(true)

    try {
      const res = await api.post('/retailer/verifications', { service_code: selected.code, ...form })
      setResult(res.data)
      setBalance(res.data.wallet_available)
    } catch (err) {
      const fieldErrors = getFieldErrors(err)
      setErrors(fieldErrors)
      if (Object.keys(fieldErrors).length === 0) {
        setFormError({
          text: getErrorMessage(err),
          noBalance: err?.response?.data?.code === 'insufficient_balance',
        })
      }
    } finally {
      setSubmitting(false)
    }
  }

  const reset = () => {
    setForm({})
    setResult(null)
    setErrors({})
    setFormError(null)
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-center">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-white">Verify Customer</h1>
          <p className="text-sm text-slate-500 dark:text-slate-400">Choose a check and enter the customer details.</p>
        </div>
        <div className="rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm dark:border-slate-800 dark:bg-slate-900">
          <span className="text-slate-500 dark:text-slate-400">Wallet balance: </span>
          <span className="font-bold text-slate-900 dark:text-white">{balance === null ? '...' : formatINR(balance)}</span>
        </div>
      </div>

      {loadingServices && <p className="text-sm text-slate-400">Loading services...</p>}

      {!loadingServices && services.length === 0 && (
        <Card>
          <p className="py-6 text-center text-sm text-slate-500">No verification service is available right now.</p>
        </Card>
      )}

      {services.length > 0 && (
        <>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {services.map((s) => {
              const Icon = metaFor(s.code).icon
              const active = selected?.code === s.code
              return (
                <button
                  key={s.code}
                  type="button"
                  onClick={() => pick(s)}
                  className={`rounded-2xl border p-5 text-left transition ${
                    active
                      ? 'border-brand-500 bg-brand-50 ring-2 ring-brand-200 dark:bg-brand-950 dark:ring-brand-900'
                      : 'border-slate-200 bg-white hover:border-brand-300 dark:border-slate-800 dark:bg-slate-900'
                  }`}
                >
                  <Icon className="h-6 w-6 text-brand-700 dark:text-brand-300" />
                  <div className="mt-3 font-semibold text-slate-900 dark:text-white">{s.name}</div>
                  <div className="text-sm text-slate-500 dark:text-slate-400">{formatINR(s.price)} per check</div>
                </button>
              )
            })}
          </div>

          <Card title={selected ? selected.name : ''}>
            {/* Aadhaar and e-Sign stay mounted (only hidden), so a check in progress is not lost when another card is clicked */}
            {options && aadhaar && (
              <div className={flow === 'otp' ? '' : 'hidden'}>
                <AadhaarCheck service={aadhaar} options={options} balance={balance} onBalance={setBalance} />
              </div>
            )}
            {options && esign && (
              <div className={flow === 'esign' ? '' : 'hidden'}>
                <EsignCheck service={esign} options={options} balance={balance} onBalance={setBalance} />
              </div>
            )}
            {!options && flow !== 'instant' && <p className="py-6 text-sm text-slate-400">Loading...</p>}

            {flow === 'instant' && !result && (
              <form onSubmit={submit} className="max-w-xl space-y-4" autoComplete="off">
                {formError && (
                  <div className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700 dark:bg-red-950 dark:text-red-300">
                    {formError.text}{' '}
                    {formError.noBalance && (
                      <Link to="/retailer/wallet" className="font-semibold underline">
                        Add money
                      </Link>
                    )}
                  </div>
                )}

                {fields.map((f) => (
                  <Input
                    key={f.key}
                    label={f.label}
                    value={form[f.key] ?? ''}
                    onChange={onChange(f)}
                    error={errors[f.key]}
                    placeholder={f.placeholder}
                    required
                  />
                ))}

                <button
                  type="submit"
                  disabled={submitting}
                  className="rounded-xl bg-brand-700 px-5 py-2.5 text-sm font-semibold text-white hover:bg-brand-800 disabled:opacity-60"
                >
                  {submitting ? 'Verifying...' : `Verify (${formatINR(selected?.price)})`}
                </button>
                <p className="text-xs text-slate-400">
                  The amount is held in your wallet during the check. You are charged only when the check succeeds.
                </p>
              </form>
            )}

            {flow === 'instant' && result && <ResultPanel result={result} onReset={reset} />}
          </Card>
        </>
      )}
    </div>
  )
}
