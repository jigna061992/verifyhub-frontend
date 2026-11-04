import { useEffect, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { Search, FileCheck2 } from 'lucide-react'
import api from '../../api/axios'
import Card from '../../components/ui/Card'
import StatusBadge from '../../components/ui/StatusBadge'
import Pagination from '../../components/ui/Pagination'
import DownloadButton from '../../components/ui/DownloadButton'
import { inputClass } from '../../components/ui/Input'
import { formatINR, formatDate } from '../../utils/format'
import { getErrorMessage } from '../../utils/errors'

const SERVICES = [
  { code: 'PAN', name: 'PAN Verification' },
  { code: 'BANK', name: 'Bank Penny Drop' },
  { code: 'AADHAAR', name: 'Aadhaar Verification' },
  { code: 'ESIGN', name: 'Consent e-Sign' },
]

export default function Verifications() {
  const [rows, setRows] = useState([])
  const [meta, setMeta] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  const [searchParams] = useSearchParams()
  const [search, setSearch] = useState(searchParams.get('search') ?? '') // the top bar search sends ?search=
  const [debouncedSearch, setDebouncedSearch] = useState(searchParams.get('search') ?? '')
  const [status, setStatus] = useState('')
  const [service, setService] = useState('')
  const [page, setPage] = useState(1)

  // Wait 400ms after typing before calling the API
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(search.trim())
      setPage(1)
    }, 400)
    return () => clearTimeout(timer)
  }, [search])

  useEffect(() => {
    let cancelled = false
    setLoading(true)
    setError('')

    api
      .get('/admin/verifications', { params: { status, service, search: debouncedSearch, page } })
      .then((res) => {
        if (cancelled) return
        const { data, ...pagination } = res.data
        setRows(data)
        setMeta(pagination)
      })
      .catch((err) => !cancelled && setError(getErrorMessage(err, 'Unable to load verifications.')))
      .finally(() => !cancelled && setLoading(false))

    return () => {
      cancelled = true
    }
  }, [status, service, debouncedSearch, page])

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-900 dark:text-white">Verifications</h1>
        <p className="text-sm text-slate-500 dark:text-slate-400">Every check done by every retailer.</p>
      </div>

      <Card>
        <div className="mb-4 flex flex-col gap-3 lg:flex-row">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search by business or last digits"
              className={`${inputClass} pl-9`}
            />
          </div>
          <select
            value={service}
            onChange={(e) => {
              setService(e.target.value)
              setPage(1)
            }}
            className={`${inputClass} lg:w-52`}
          >
            <option value="">All services</option>
            {SERVICES.map((s) => (
              <option key={s.code} value={s.code}>{s.name}</option>
            ))}
          </select>
          <select
            value={status}
            onChange={(e) => {
              setStatus(e.target.value)
              setPage(1)
            }}
            className={`${inputClass} lg:w-44`}
          >
            <option value="">All statuses</option>
            <option value="success">Success</option>
            <option value="failed">Failed</option>
            <option value="pending">Pending</option>
          </select>
        </div>

        {error && <p className="mb-3 text-sm text-red-600">{error}</p>}

        <div className="overflow-x-auto">
          <table className="w-full min-w-[860px] text-left text-sm">
            <thead>
              <tr className="border-b border-slate-100 text-xs uppercase tracking-wide text-slate-400 dark:border-slate-800">
                <th className="pb-3 font-semibold">Date</th>
                <th className="pb-3 font-semibold">Retailer</th>
                <th className="pb-3 font-semibold">Service</th>
                <th className="pb-3 font-semibold">Checked</th>
                <th className="pb-3 font-semibold">Revenue</th>
                <th className="pb-3 font-semibold">Margin</th>
                <th className="pb-3 font-semibold">Status</th>
                <th className="pb-3 text-right font-semibold">Receipt</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
              {loading && <tr><td colSpan="8" className="py-10 text-center text-slate-400">Loading...</td></tr>}

              {!loading && rows.length === 0 && (
                <tr>
                  <td colSpan="8" className="py-12 text-center text-slate-400">
                    <FileCheck2 className="mx-auto mb-2 h-8 w-8" />
                    No verifications found.
                  </td>
                </tr>
              )}

              {!loading &&
                rows.map((r) => (
                  <tr key={r.id} className="text-slate-700 dark:text-slate-200">
                    <td className="py-3">{formatDate(r.created_at)}</td>
                    <td className="py-3 font-semibold">{r.business_name}</td>
                    <td className="py-3">{r.service_name}</td>
                    <td className="py-3 font-mono text-xs">{r.input_masked}</td>
                    <td className="py-3">{r.price > 0 ? formatINR(r.price) : '-'}</td>
                    <td className="py-3 text-brand-700 dark:text-brand-300">{r.margin > 0 ? formatINR(r.margin) : '-'}</td>
                    <td className="py-3">
                      <StatusBadge status={r.status} />
                      {r.failure_reason && <div className="mt-1 text-[11px] text-slate-400">{r.failure_reason}</div>}
                    </td>
                    <td className="py-3 text-right">
                      {r.status !== 'pending' && (
                        <DownloadButton
                          compact
                          url={`/admin/verifications/${r.id}/receipt`}
                          filename="receipt.pdf"
                          label="PDF"
                          onError={setError}
                        />
                      )}
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
