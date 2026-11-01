import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { Plus, ClipboardList } from 'lucide-react'
import api from '../../api/axios'
import Card from '../../components/ui/Card'
import StatusBadge from '../../components/ui/StatusBadge'
import Pagination from '../../components/ui/Pagination'
import { inputClass } from '../../components/ui/Input'
import { formatINR, formatDate } from '../../utils/format'
import { getErrorMessage } from '../../utils/errors'

const STEP_LABELS = { aadhaar: 'Aadhaar OTP', pan: 'PAN', bank: 'Bank account', esign: 'e-Sign', done: 'All done' }

export default function KycList() {
  const [rows, setRows] = useState([])
  const [meta, setMeta] = useState(null)
  const [status, setStatus] = useState('')
  const [page, setPage] = useState(1)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    let cancelled = false
    setLoading(true)
    setError('')

    api
      .get('/retailer/kyc', { params: { status, page } })
      .then((res) => {
        if (cancelled) return
        const { data, ...pagination } = res.data
        setRows(data)
        setMeta(pagination)
      })
      .catch((err) => !cancelled && setError(getErrorMessage(err, 'Unable to load KYC list.')))
      .finally(() => !cancelled && setLoading(false))

    return () => {
      cancelled = true
    }
  }, [status, page])

  return (
    <div className="space-y-6">
      <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-center">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-white">Complete KYC</h1>
          <p className="text-sm text-slate-500 dark:text-slate-400">
            Aadhaar OTP, PAN, bank account and e-Sign consent in one guided flow.
          </p>
        </div>
        <Link
          to="/retailer/kyc/new"
          className="inline-flex items-center justify-center gap-2 rounded-xl bg-brand-700 px-4 py-2.5 text-sm font-semibold text-white hover:bg-brand-800"
        >
          <Plus className="h-4 w-4" /> Start new KYC
        </Link>
      </div>

      <Card>
        <div className="mb-4">
          <select
            value={status}
            onChange={(e) => {
              setStatus(e.target.value)
              setPage(1)
            }}
            className={`${inputClass} sm:w-52`}
          >
            <option value="">All statuses</option>
            <option value="in_progress">In progress</option>
            <option value="completed">Completed</option>
            <option value="failed">Failed</option>
            <option value="cancelled">Cancelled</option>
            <option value="expired">Expired</option>
          </select>
        </div>

        {error && <p className="mb-3 text-sm text-red-600">{error}</p>}

        <div className="overflow-x-auto">
          <table className="w-full min-w-[760px] text-left text-sm">
            <thead>
              <tr className="border-b border-slate-100 text-xs uppercase tracking-wide text-slate-400 dark:border-slate-800">
                <th className="pb-3 font-semibold">Customer</th>
                <th className="pb-3 font-semibold">Mobile</th>
                <th className="pb-3 font-semibold">Status</th>
                <th className="pb-3 font-semibold">Current step</th>
                <th className="pb-3 font-semibold">Charged</th>
                <th className="pb-3 font-semibold">Started</th>
                <th className="pb-3" />
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
              {loading && (
                <tr><td colSpan="7" className="py-10 text-center text-slate-400">Loading...</td></tr>
              )}

              {!loading && rows.length === 0 && (
                <tr>
                  <td colSpan="7" className="py-12 text-center text-slate-400">
                    <ClipboardList className="mx-auto mb-2 h-8 w-8" />
                    No KYC started yet.
                  </td>
                </tr>
              )}

              {!loading &&
                rows.map((c) => (
                  <tr key={c.id} className="text-slate-700 dark:text-slate-200">
                    <td className="py-3 font-semibold">{c.customer_name}</td>
                    <td className="py-3 font-mono text-xs">{c.customer_mobile_masked}</td>
                    <td className="py-3"><StatusBadge status={c.status} /></td>
                    <td className="py-3">{c.status === 'in_progress' ? STEP_LABELS[c.current_step] : '-'}</td>
                    <td className="py-3">{c.charged > 0 ? formatINR(c.charged) : '-'}</td>
                    <td className="py-3">{formatDate(c.created_at)}</td>
                    <td className="py-3 text-right">
                      <Link
                        to={`/retailer/kyc/${c.id}`}
                        className="text-sm font-semibold text-brand-700 hover:underline dark:text-brand-300"
                      >
                        {c.status === 'in_progress' ? 'Continue' : 'View'}
                      </Link>
                    </td>
                  </tr>
                ))}
            </tbody>
          </table>
        </div>

        <Pagination meta={meta} onPage={setPage} />
      </Card>
    </div>
  )
}
