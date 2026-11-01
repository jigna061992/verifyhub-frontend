import { useCallback, useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import {
  Fingerprint, CreditCard, Landmark, Building2, FileSignature, ShieldCheck,
  Tags, Plug, AlertTriangle,
} from 'lucide-react'
import api from '../../api/axios'
import Toast from '../../components/ui/Toast'
import { formatINR } from '../../utils/format'
import { getErrorMessage } from '../../utils/errors'

// Icon, colour and short description of every service (matched by service code)
const META = {
  AADHAAR: {
    icon: Fingerprint,
    tone: 'bg-violet-50 text-violet-600 dark:bg-violet-950 dark:text-violet-300',
    text: 'OTP-based Aadhaar authentication through a UIDAI-authorised partner. Returns name, gender, year of birth and state.',
  },
  PAN: {
    icon: CreditCard,
    tone: 'bg-blue-50 text-blue-600 dark:bg-blue-950 dark:text-blue-300',
    text: 'Validate PAN, holder name and status against the income-tax source.',
  },
  BANK: {
    icon: Landmark,
    tone: 'bg-sky-50 text-sky-600 dark:bg-sky-950 dark:text-sky-300',
    text: 'Penny drop to the account. Returns the account holder name registered with the bank.',
  },
  GST: {
    icon: Building2,
    tone: 'bg-amber-50 text-amber-600 dark:bg-amber-950 dark:text-amber-300',
    text: 'Validate GSTIN, legal name and registration status.',
  },
  ESIGN: {
    icon: FileSignature,
    tone: 'bg-emerald-50 text-emerald-600 dark:bg-emerald-950 dark:text-emerald-300',
    text: 'Generates the customer consent letter and collects a legally valid Aadhaar OTP e-Signature.',
  },
}

function Stat({ label, value }) {
  return (
    <div className="rounded-xl border border-slate-200 p-3 dark:border-slate-800">
      <div className="text-[10px] font-semibold uppercase tracking-wide text-slate-400">{label}</div>
      <div className="mt-1 text-lg font-bold text-slate-900 dark:text-white">{value}</div>
    </div>
  )
}

function Switch({ checked, onChange, disabled, label }) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={label}
      disabled={disabled}
      onClick={onChange}
      className={`relative h-6 w-11 shrink-0 rounded-full transition disabled:opacity-60 ${
        checked ? 'bg-brand-600' : 'bg-slate-300 dark:bg-slate-700'
      }`}
    >
      <span
        className={`absolute left-0.5 top-0.5 h-5 w-5 rounded-full bg-white shadow transition-transform ${
          checked ? 'translate-x-5' : ''
        }`}
      />
    </button>
  )
}

function ServiceCard({ service, busy, onToggle }) {
  const meta = META[service.code] || { icon: ShieldCheck, tone: 'bg-slate-100 text-slate-600', text: '' }
  const Icon = meta.icon
  const rate = service.success_rate

  return (
    <section
      className={`rounded-2xl border bg-white p-5 shadow-sm dark:bg-slate-900 ${
        service.enabled ? 'border-slate-200 dark:border-slate-800' : 'border-slate-200 opacity-75 dark:border-slate-800'
      }`}
    >
      <div className="flex items-start gap-4">
        <span className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-xl ${meta.tone}`}>
          <Icon className="h-6 w-6" />
        </span>

        <div className="min-w-0 flex-1">
          <div className="flex items-start justify-between gap-2">
            <h3 className="font-semibold text-slate-900 dark:text-white">{service.name}</h3>
            <span
              className={`shrink-0 rounded-full px-2.5 py-1 text-xs font-semibold ${
                service.enabled
                  ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300'
                  : 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300'
              }`}
            >
              {service.enabled ? 'Active' : 'Disabled'}
            </span>
          </div>
          <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">{meta.text}</p>
          {!service.built && (
            <span className="mt-2 inline-block rounded-full bg-amber-50 px-2.5 py-1 text-xs font-semibold text-amber-700 dark:bg-amber-950 dark:text-amber-300">
              Coming soon
            </span>
          )}
        </div>
      </div>

      <div className="mt-4 grid grid-cols-3 gap-3">
        <Stat label="Cost / check" value={formatINR(service.default_price)} />
        <Stat label="Total usage" value={service.total_usage} />
        <Stat label="Success rate" value={rate === null ? '-' : `${rate}%`} />
      </div>

      <div className="mt-3 flex items-center justify-between text-xs text-slate-500 dark:text-slate-400">
        <span>
          Provider cost {formatINR(service.provider_cost)} · margin {formatINR(service.margin)}
        </span>
        <span>{service.success_count} verified</span>
      </div>

      <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-slate-100 dark:bg-slate-800">
        <div className="h-full rounded-full bg-brand-500" style={{ width: `${rate ?? 0}%` }} />
      </div>

      <div className="mt-4 flex items-center justify-between border-t border-slate-100 pt-4 dark:border-slate-800">
        <span className="text-sm text-slate-600 dark:text-slate-300">Available to all active retailers</span>
        <Switch
          checked={service.enabled}
          disabled={busy}
          onChange={() => onToggle(service)}
          label={`${service.enabled ? 'Disable' : 'Enable'} ${service.name}`}
        />
      </div>
    </section>
  )
}

export default function KycServices() {
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [busyId, setBusyId] = useState(null)
  const [toast, setToast] = useState(null)
  const closeToast = useCallback(() => setToast(null), [])

  const load = useCallback(() => {
    setError('')
    api
      .get('/admin/kyc-services')
      .then((res) => setData(res.data))
      .catch((err) => setError(getErrorMessage(err, 'Unable to load KYC services.')))
      .finally(() => setLoading(false))
  }, [])

  useEffect(() => {
    load()
  }, [load])

  const toggle = async (service) => {
    const next = !service.enabled

    if (!next && !window.confirm(`Disable ${service.name}? Retailers will not be able to run this check until you enable it again.`)) {
      return
    }

    setBusyId(service.id)
    try {
      await api.put(`/admin/services/${service.id}`, { enabled: next })
      setToast({ type: 'success', text: `${service.name} ${next ? 'enabled' : 'disabled'}.` })
      load()
    } catch (err) {
      setToast({ type: 'error', text: getErrorMessage(err) })
    } finally {
      setBusyId(null)
    }
  }

  return (
    <div className="space-y-6">
      <Toast toast={toast} onClose={closeToast} />

      <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-center">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-white">KYC service management</h1>
          <p className="text-sm text-slate-500 dark:text-slate-400">Control which verification APIs are available to retailers.</p>
        </div>
        <Link
          to="/admin/pricing"
          className="inline-flex items-center justify-center gap-2 rounded-xl border border-slate-300 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200 dark:hover:bg-slate-800"
        >
          <Tags className="h-4 w-4" /> Manage pricing
        </Link>
      </div>

      {error && <p className="text-sm text-red-600">{error}</p>}
      {loading && <p className="text-sm text-slate-400">Loading services...</p>}

      {data && (
        <>
          <div className="flex items-center gap-3 rounded-xl border border-sky-200 bg-sky-50 px-4 py-3 text-sm text-sky-900 dark:border-sky-900 dark:bg-sky-950 dark:text-sky-200">
            <Plug className="h-5 w-5 shrink-0" />
            <p>
              <strong>
                {data.enabled_count} of {data.total_count} services enabled.
              </strong>{' '}
              Disabling a service hides it from retailers and blocks new requests. Checks already running finish normally.
            </p>
          </div>

          <div className="grid gap-5 lg:grid-cols-2">
            {data.services.map((s) => (
              <ServiceCard key={s.id} service={s} busy={busyId === s.id} onToggle={toggle} />
            ))}
          </div>

          <div className="flex items-start gap-3 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900 dark:border-amber-900 dark:bg-amber-950 dark:text-amber-200">
            <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0" />
            <p>
              <strong>Compliance note:</strong> Aadhaar is verified only through OTP authentication with a UIDAI-authorised
              partner, and e-Sign through a licensed e-Sign Service Provider. The full Aadhaar number is never stored or
              shown (masked as XXXX XXXX 1234), and every check requires recorded customer consent.
            </p>
          </div>
        </>
      )}
    </div>
  )
}
