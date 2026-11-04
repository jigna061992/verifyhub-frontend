import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { ShieldCheck, Loader2 } from 'lucide-react'
import api from '../../../api/axios'
import Input from '../../../components/ui/Input'
import { getErrorMessage, getFieldErrors } from '../../../utils/errors'
import { isPan, isIfsc, isAccountNo, nameError, panType } from '../../../utils/validators'
import ConsentCheck from './ConsentCheck'
import ResultCard from './ResultCard'
import ServiceShell from './ServiceShell'
import useService from './useService'
import { primaryBtn, chipBtn } from './helpers'

// One-call services. digits = numbers only, upper = capital letters, check = quick validation
const CONFIG = {
  PAN: {
    title: 'PAN Card Verification',
    subtitle: 'Validate a Permanent Account Number and fetch the holder name.',
    button: 'Verify PAN',
    docLabel: 'Document',
    fields: [
      { key: 'pan', label: 'PAN number', placeholder: 'e.g. ABCPK1234L', max: 10, upper: true, hint: '10 characters: 5 letters, 4 digits, 1 letter', check: (v) => (!v ? 'PAN number is required.' : !isPan(v) ? 'Enter a valid PAN, like ABCPK1234L.' : null) },
    ],
    note: 'Identifiers are masked in history and never stored in full.',
  },
  BANK: {
    title: 'Bank Penny Drop',
    subtitle: 'Verify a bank account and fetch the account holder name.',
    button: 'Verify bank account',
    docLabel: 'Account',
    fields: [
      { key: 'account_number', label: 'Account number', placeholder: '9 to 18 digits', max: 18, digits: true, hint: '9 to 18 digits', check: (v) => (!v ? 'Account number is required.' : !isAccountNo(v) ? 'Account number must be 9 to 18 digits.' : null) },
      { key: 'ifsc', label: 'IFSC code', placeholder: 'e.g. SBIN0001234', max: 11, upper: true, hint: '11 characters, the 5th is zero', check: (v) => (!v ? 'IFSC code is required.' : !isIfsc(v) ? 'Enter a valid IFSC, like SBIN0001234.' : null) },
    ],
    note: 'Account numbers are masked in history and never stored in full.',
  },
}

export default function InstantServicePage({ code }) {
  const cfg = CONFIG[code]
  const { info, recent, state, reload } = useService(code)

  const [values, setValues] = useState({})
  const [name, setName] = useState('')
  const [consent, setConsent] = useState(false)
  const [touched, setTouched] = useState({})
  const [serverErrors, setServerErrors] = useState({})
  const [error, setError] = useState(null) // { text, noBalance }
  const [busy, setBusy] = useState(false)
  const [result, setResult] = useState(null)
  const [balance, setBalance] = useState(0)

  useEffect(() => {
    if (info) setBalance(info.wallet_available)
  }, [info])

  if (state === 'loading') return <p className="text-slate-500">Loading...</p>
  if (state === 'unavailable') return <p className="text-slate-600 dark:text-slate-300">{cfg.title} is not enabled for your account. Please contact the admin.</p>
  if (state === 'error') return <p className="text-red-600">Unable to load this page. Please refresh.</p>

  const purpose = info.purposes[0]
  const lowBalance = balance < info.price

  const clientErrors = { customer_name: nameError(name), consent: consent ? null : 'Consent is required.' }
  cfg.fields.forEach((f) => { clientErrors[f.key] = f.check(values[f.key] ?? '') })

  const shown = (key) => serverErrors[key] || (touched[key] ? clientErrors[key] : null)
  const valid = Object.values(clientErrors).every((e) => !e)

  const setField = (f) => (e) => {
    let v = e.target.value
    if (f.digits) v = v.replace(/\D/g, '')
    if (f.upper) v = v.toUpperCase().replace(/\s/g, '')
    setValues({ ...values, [f.key]: v.slice(0, f.max) })
  }

  const clear = () => {
    setValues({})
    setName('')
    setConsent(false)
    setTouched({})
    setServerErrors({})
    setError(null)
    setResult(null)
  }

  const submit = async (e) => {
    e.preventDefault()
    if (busy) return

    const all = { customer_name: true, consent: true }
    cfg.fields.forEach((f) => { all[f.key] = true })
    setTouched(all)
    if (!valid) return

    setBusy(true)
    setServerErrors({})
    setError(null)
    setResult(null)

    try {
      const res = await api.post('/retailer/verifications', {
        service_code: code,
        ...values,
        customer_name: name.trim(),
        purpose: purpose?.value,
        consent,
      })
      setResult({ ...res.data, customer_name: res.data.customer_name ?? (name.trim() || null) })
      setBalance(res.data.wallet_available)
      reload()
    } catch (err) {
      const fieldErrors = getFieldErrors(err)
      setServerErrors(fieldErrors)
      if (Object.keys(fieldErrors).length === 0) {
        setError({ text: getErrorMessage(err), noBalance: err?.response?.data?.code === 'insufficient_balance' })
      }
    } finally {
      setBusy(false)
    }
  }

  const pan = values.pan ?? ''
  const holder = code === 'PAN' && isPan(pan) ? panType(pan) : null

  return (
    <ServiceShell
      info={info}
      balance={balance}
      recent={recent}
      title={cfg.title}
      subtitle={cfg.subtitle}
      docLabel={cfg.docLabel}
      note={cfg.note}
      result={result ? <ResultCard result={result} onReset={clear} /> : null}
    >
      <form onSubmit={submit} className="space-y-4" autoComplete="off">
        {error && (
          <div className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700 dark:bg-red-950 dark:text-red-300">
            {error.text}{' '}
            {error.noBalance && <Link to="/retailer/wallet" className="font-semibold underline">Add money</Link>}
          </div>
        )}

        {cfg.fields.map((f) => (
          <Input
            key={f.key}
            label={<>{f.label} <span className="text-red-500">*</span></>}
            value={values[f.key] ?? ''}
            onChange={setField(f)}
            onBlur={() => setTouched((t) => ({ ...t, [f.key]: true }))}
            error={shown(f.key)}
            hint={holder && f.key === 'pan' ? `${f.hint} · Holder type: ${holder}` : f.hint}
            placeholder={f.placeholder}
            inputMode={f.digits ? 'numeric' : undefined}
            className={f.upper ? '[&_input]:uppercase' : ''}
          />
        ))}

        <Input
          label={<span className="flex justify-between"><span>Customer name</span><span className="font-normal text-slate-400">Optional · for name match</span></span>}
          value={name}
          onChange={(e) => setName(e.target.value)}
          onBlur={() => setTouched((t) => ({ ...t, customer_name: true }))}
          error={shown('customer_name')}
          placeholder="Full name"
        />

        {info.samples.length > 0 && (
          <div className="flex flex-wrap items-center gap-2 text-xs text-slate-500">
            Try sample:
            {info.samples.map((s) => (
              <button key={s.label} type="button" className={chipBtn} onClick={() => setValues(s.values)}>{s.label}</button>
            ))}
          </div>
        )}

        <ConsentCheck
          consent={info.consent}
          vars={{ retailer: info.retailer, purpose: purpose?.label }}
          checked={consent}
          onChange={(c) => { setConsent(c); setTouched((t) => ({ ...t, consent: true })) }}
          error={shown('consent')}
        />

        <div className="flex items-center justify-end gap-3">
          <button type="button" onClick={clear} disabled={busy} className="px-3 text-sm font-semibold text-slate-600 hover:text-slate-900 dark:text-slate-300">Clear</button>
          <button type="submit" disabled={busy || !consent || lowBalance} className={primaryBtn}>
            {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <ShieldCheck className="h-4 w-4" />}
            {busy ? 'Verifying...' : cfg.button}
          </button>
        </div>

        {lowBalance && (
          <p className="text-xs text-red-600">
            Your wallet balance is low. <Link to="/retailer/wallet" className="font-semibold underline">Add money</Link>
          </p>
        )}
        <p className="text-xs text-slate-400">The amount is held in your wallet during the check. You are charged only when the check succeeds.</p>
      </form>
    </ServiceShell>
  )
}
