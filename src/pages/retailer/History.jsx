import { useEffect, useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { History as HistoryIcon } from 'lucide-react'
import api from '../../api/axios'
import Card from '../../components/ui/Card'
import StatusBadge from '../../components/ui/StatusBadge'
import Pagination from '../../components/ui/Pagination'
import DownloadButton from '../../components/ui/DownloadButton'
import { inputClass } from '../../components/ui/Input'
import { formatINR, formatDate } from '../../utils/format'
import { getErrorMessage } from '../../utils/errors'

export default function History() {
  const [rows, setRows] = useState([])
  const [meta, setMeta] = useState(null)
  const [services, setServices] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  const [status, setStatus] = useState('')
  const [searchParams] = useSearchParams()
  const [service, setService] = useState(searchParams.get('service') ?? '')
  const [page, setPage] = useState(1)

  useEffect(() => {
    // Single checks + "Complete KYC"
    api.get('/retailer/history/services').then((res) => setServices(res.data)).catch(() => {})
  }, [])

  useEffect(() => {
    let cancelled = false
    setLoading(true)
    setError('')

    api
      .get('/retailer/history', { params: { status, service, page } })
      .then((res) => {
        if (cancelled) return
        const { data, ...pagination } = res.data
        setRows(data)
        setMeta(pagination)
      })
      .catch((err) => !cancelled && setError(getErrorMessage(err, 'Unable to load history.')))
      .finally(() => !cancelled && setLoading(false))

    return () => {
      cancelled = true
    }
  }, [status, service, page])

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-900 dark:text-white">History</h1>
        <p className="text-sm text-slate-500 dark:text-slate-400">All single checks and Complete KYC done from your account.</p>
      </div>

      <Card>
        <div className="mb-4 flex flex-col gap-3 sm:flex-row">
          <select
            value={service}
            onChange={(e) => {
              setService(e.target.value)
              setPage(1)
            }}
            className={`${inputClass} sm:w-56`}
          >
            <option value="">All services</option>
            {services.map((s) => (
              <option key={s.code} value={s.code}>{s.name}</option>
            ))}
          </select>
          <select
            value={status}
            onChange={(e) => {
              setStatus(e.target.value)
              setPage(1)
            }}
            className={`${inputClass} sm:w-44`}
          >
            <option value="">All statuses</option>
            <option value="success">Success</option>
            <option value="failed">Failed (incl. cancelled / expired KYC)</option>
            <option value="pending">Pending / in progress</option>
          </select>
          <div className="sm:ml-auto">
            <DownloadButton
              url="/retailer/export/verifications"
              params={{ status, service }}
              filename="verification-history.csv"
              label="Download CSV"
              onError={setError}
            />
          </div>
        </div>

        {error && <p className="mb-3 text-sm text-red-600">{error}</p>}

        <div className="overflow-x-auto">
          <table className="w-full min-w-[720px] text-left text-sm">
            <thead>
              <tr className="border-b border-slate-100 text-xs uppercase tracking-wide text-slate-400 dark:border-slate-800">
                <th className="pb-3 font-semibold">Date</th>
                <th className="pb-3 font-semibold">Service</th>
                <th className="pb-3 font-semibold">Checked</th>
                <th className="pb-3 font-semibold">Charged</th>
                <th className="pb-3 font-semibold">Status</th>
                <th className="pb-3 font-semibold">Note</th>
                <th className="pb-3 text-right font-semibold">Receipt</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
              {loading && <tr><td colSpan="7" className="py-10 text-center text-slate-400">Loading...</td></tr>}

              {!loading && rows.length === 0 && (
                <tr>
                  <td colSpan="7" className="py-12 text-center text-slate-400">
                    <HistoryIcon className="mx-auto mb-2 h-8 w-8" />
                    No history yet.
                  </td>
                </tr>
              )}

              {!loading &&
                rows.map((r) => (
                  <tr key={`${r.kind}-${r.id}`} className="text-slate-700 dark:text-slate-200">
                    <td className="py-3">{formatDate(r.created_at)}</td>
                    <td className="py-3 font-semibold">
                      {r.service_name}
                      {r.customer_name && (
                        <div className="text-xs font-normal text-slate-500 dark:text-slate-400">{r.customer_name}</div>
                      )}
                    </td>
                    <td className="py-3 font-mono text-xs">{r.input_masked}</td>
                    <td className="py-3">{r.charged > 0 ? formatINR(r.charged) : '-'}</td>
                    <td className="py-3"><StatusBadge status={r.status} /></td>
                    <td className="py-3 text-xs text-slate-500">{r.failure_reason ?? ''}</td>
                    <td className="py-3 text-right">
                      <div className="flex items-center justify-end gap-2">
                        {r.detail_path && (
                          <Link
                            to={r.detail_path}
                            className="text-xs font-semibold text-brand-700 hover:underline dark:text-brand-300"
                          >
                            {r.status === 'in_progress' ? 'Continue' : 'View'}
                          </Link>
                        )}
                        {r.receipt_url && (
                          <DownloadButton
                            compact
                            url={r.receipt_url}
                            filename={r.receipt_filename}
                            label="PDF"
                            onError={setError}
                          />
                        )}
                      </div>
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
