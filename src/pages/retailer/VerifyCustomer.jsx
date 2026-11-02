import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { ArrowRight, ListChecks } from 'lucide-react'
import api from '../../api/axios'
import Card from '../../components/ui/Card'
import { metaFor } from '../../utils/serviceMeta'
import { formatINR } from '../../utils/format'
import { SERVICE_PATH } from './services/helpers'

// Each service has its own page now. This screen is just the list of them.
export default function VerifyCustomer() {
  const [services, setServices] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    api
      .get('/retailer/services')
      .then((res) => setServices(res.data))
      .catch(() => setError('Unable to load services.'))
      .finally(() => setLoading(false))
  }, [])

  const tile = 'group flex items-center justify-between rounded-2xl border border-slate-200 bg-white p-5 transition hover:border-brand-300 dark:border-slate-800 dark:bg-slate-900'

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-900 dark:text-white">Verify Customer</h1>
        <p className="text-sm text-slate-500 dark:text-slate-400">Choose a check. Each one has its own page with history.</p>
      </div>

      {loading && <p className="text-sm text-slate-400">Loading services...</p>}
      {error && <p className="text-sm text-red-600">{error}</p>}

      {!loading && !error && services.length === 0 && (
        <Card><p className="py-6 text-center text-sm text-slate-500">No verification service is available right now.</p></Card>
      )}

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {services.map((s) => {
          const meta = metaFor(s.code)
          const Icon = meta.icon
          return (
            <Link key={s.code} to={SERVICE_PATH[s.code]} className={tile}>
              <span className="flex items-center gap-4">
                <span className={`flex h-12 w-12 items-center justify-center rounded-xl ${meta.tone}`}><Icon className="h-6 w-6" /></span>
                <span>
                  <span className="block font-semibold text-slate-900 dark:text-white">{s.name}</span>
                  <span className="text-sm text-slate-500 dark:text-slate-400">{formatINR(s.price)} per check</span>
                </span>
              </span>
              <ArrowRight className="h-5 w-5 text-slate-400 group-hover:text-brand-600" />
            </Link>
          )
        })}

        <Link to="/retailer/kyc" className={tile}>
          <span className="flex items-center gap-4">
            <span className={`flex h-12 w-12 items-center justify-center rounded-xl ${metaFor('COMPLETE_KYC').tone}`}><ListChecks className="h-6 w-6" /></span>
            <span>
              <span className="block font-semibold text-slate-900 dark:text-white">Complete KYC</span>
              <span className="text-sm text-slate-500 dark:text-slate-400">Aadhaar, PAN, Bank and e-Sign in one case</span>
            </span>
          </span>
          <ArrowRight className="h-5 w-5 text-slate-400 group-hover:text-brand-600" />
        </Link>
      </div>
    </div>
  )
}
