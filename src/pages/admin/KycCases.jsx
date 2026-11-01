import { useEffect, useState } from 'react'
import { Search, ClipboardList, X } from 'lucide-react'
import api from '../../api/axios'
import Card from '../../components/ui/Card'
import StatusBadge from '../../components/ui/StatusBadge'
import Pagination from '../../components/ui/Pagination'
import DownloadButton from '../../components/ui/DownloadButton'
import { inputClass } from '../../components/ui/Input'
import { formatINR, formatDate } from '../../utils/format'
import { getErrorMessage } from '../../utils/errors'

const STEP_LABELS = { aadhaar: 'Aadhaar', pan: 'PAN', bank: 'Bank', esign: 'e-Sign', done: 'Done' }

export default function KycCases() {
  const [rows, setRows] = useState([])
  const [meta, setMeta] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  const [search, setSearch] = useState('')
  const [debouncedSearch, setDebouncedSearch] = useState('')
  const [status, setStatus] = useState('')
  const [page, setPage] = useState(1)

  const [selected, setSelected] = useState(null) // case id opened in the detail panel

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
      .get('/admin/kyc-cases', { params: { status, search: debouncedSearch, page } })
      .then((res) => {
        if (cancelled) return
        const { data, ...pagination } = res.data
        setRows(data)
        setMeta(pagination)
      })
      .catch((err) => !cancelled && setError(getErrorMessage(err, 'Unable to load KYC cases.')))
      .finally(() => !cancelled && setLoading(false))

    return () => {
      cancelled = true
    }
  }, [status, debouncedSearch, page])

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-900 dark:text-white">KYC Cases</h1>
        <p className="text-sm text-slate-500 dark:text-slate-400">
          Every Complete KYC started by every retailer. Customer names are not shown here.
        </p>
      </div>

      <Card>
        <div className="mb-4 flex flex-col gap-3 lg:flex-row">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search by business, reference or last 4 digits of mobile"
              className={`${inputClass} pl-9`}
            />
          </div>
          <select
            value={status}
            onChange={(e) => {
              setStatus(e.target.value)
              setPage(1)
            }}
            className={`${inputClass} lg:w-48`}
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
          <table className="w-full min-w-[900px] text-left text-sm">
            <thead>
              <tr className="border-b border-slate-100 text-xs uppercase tracking-wide text-slate-400 dark:border-slate-800">
                <th className="pb-3 font-semibold">Date</th>
                <th className="pb-3 font-semibold">Retailer</th>
                <th className="pb-3 font-semibold">Customer mobile</th>
                <th className="pb-3 font-semibold">Step</th>
                <th className="pb-3 font-semibold">Revenue</th>
                <th className="pb-3 font-semibold">Margin</th>
                <th className="pb-3 font-semibold">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
              {loading && <tr><td colSpan="7" className="py-10 text-center text-slate-400">Loading...</td></tr>}

              {!loading && rows.length === 0 && (
                <tr>
                  <td colSpan="7" className="py-12 text-center text-slate-400">
                    <ClipboardList className="mx-auto mb-2 h-8 w-8" />
                    No KYC cases found.
                  </td>
                </tr>
              )}

              {!loading &&
                rows.map((r) => (
                  <tr
                    key={r.id}
                    onClick={() => setSelected(r.id)}
                    className="cursor-pointer text-slate-700 hover:bg-slate-50 dark:text-slate-200 dark:hover:bg-slate-800/50"
                  >
                    <td className="py-3">{formatDate(r.created_at)}</td>
                    <td className="py-3 font-semibold">{r.business_name}</td>
                    <td className="py-3 font-mono text-xs">XXXXXX{r.mobile_last4}</td>
                    <td className="py-3">{STEP_LABELS[r.current_step] || r.current_step}</td>
                    <td className="py-3">{r.price > 0 ? formatINR(r.price) : '-'}</td>
                    <td className="py-3 text-brand-700 dark:text-brand-300">{r.margin > 0 ? formatINR(r.margin) : '-'}</td>
                    <td className="py-3">
                      <StatusBadge status={r.status} />
                      {r.failure_reason && <div className="mt-1 text-[11px] text-slate-400">{r.failure_reason}</div>}
                    </td>
                  </tr>
                ))}
            </tbody>
          </table>
        </div>

        <Pagination meta={meta} onPage={setPage} />
      </Card>

      {selected && <CaseDetail id={selected} onClose={() => setSelected(null)} />}
    </div>
  )
}

function CaseDetail({ id, onClose }) {
  const [data, setData] = useState(null)
  const [error, setError] = useState('')

  useEffect(() => {
    let cancelled = false
    api
      .get(`/admin/kyc-cases/${id}`)
      .then((res) => !cancelled && setData(res.data))
      .catch((err) => !cancelled && setError(getErrorMessage(err, 'Unable to load this case.')))
    return () => {
      cancelled = true
    }
  }, [id])

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/50 p-0 sm:items-center sm:p-4" onClick={onClose}>
      <div
        className="max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded-t-2xl bg-white p-5 shadow-xl dark:bg-slate-900 sm:rounded-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="mb-4 flex items-start justify-between gap-3">
          <div>
            <h2 className="text-lg font-bold text-slate-900 dark:text-white">KYC case</h2>
            {data && <p className="break-all font-mono text-xs text-slate-400">{data.reference}</p>}
          </div>
          <button onClick={onClose} aria-label="Close" className="rounded-lg p-2 text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800">
            <X className="h-5 w-5" />
          </button>
        </div>

        {error && <p className="text-sm text-red-600">{error}</p>}
        {!data && !error && <p className="py-8 text-center text-slate-400">Loading...</p>}

        {data && (
          <div className="space-y-5 text-sm text-slate-700 dark:text-slate-200">
            <div className="grid grid-cols-2 gap-3">
              <Info label="Retailer" value={data.business_name} />
              <Info label="Customer mobile" value={`XXXXXX${data.mobile_last4}`} />
              <Info label="Status" value={<StatusBadge status={data.status} />} />
              <Info label="Price / our cost" value={`${formatINR(data.price)} / ${formatINR(data.provider_cost)}`} />
              <Info label="Started" value={formatDate(data.created_at)} />
              <Info label="Closed" value={data.closed_at ? formatDate(data.closed_at) : '-'} />
            </div>

            {data.status !== 'in_progress' && (
              <DownloadButton
                url={`/admin/kyc-cases/${data.id}/report`}
                filename="kyc-audit-report.pdf"
                label="Audit report (PDF)"
                onError={setError}
              />
            )}

            {data.failure_reason && (
              <p className="rounded-lg bg-slate-50 p-3 text-xs text-slate-600 dark:bg-slate-800 dark:text-slate-300">{data.failure_reason}</p>
            )}

            <div>
              <h3 className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-400">Steps</h3>
              <div className="divide-y divide-slate-100 rounded-xl border border-slate-100 dark:divide-slate-800 dark:border-slate-800">
                {data.steps.map((s) => (
                  <div key={s.step} className="flex items-center justify-between gap-3 p-3">
                    <div>
                      <div className="font-semibold">{STEP_LABELS[s.step] || s.step}</div>
                      <div className="text-xs text-slate-400">
                        {s.input_masked ? <span className="font-mono">{s.input_masked}</span> : 'No input yet'}
                        {s.attempts > 0 && ` · ${s.attempts} failed ${s.attempts === 1 ? 'try' : 'tries'}`}
                      </div>
                      {s.failure_reason && <div className="text-[11px] text-red-500">{s.failure_reason}</div>}
                    </div>
                    <StatusBadge status={s.status} />
                  </div>
                ))}
              </div>
            </div>

            <div>
              <h3 className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-400">Consent log</h3>
              {data.consents.length === 0 && <p className="text-xs text-slate-400">No consent recorded.</p>}
              <div className="space-y-2">
                {data.consents.map((c, i) => (
                  <div key={i} className="rounded-xl border border-slate-100 p-3 text-xs dark:border-slate-800">
                    <div className="font-semibold capitalize">{c.type.replace('_', ' ')} · {c.text_version} · {c.channel.replace('_', ' ')}</div>
                    <div className="text-slate-400">{formatDate(c.accepted_at)}{c.ip_address && ` · IP ${c.ip_address}`}</div>
                    <div className="mt-1 break-all font-mono text-[10px] text-slate-400">SHA-256 {c.text_hash}</div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

function Info({ label, value }) {
  return (
    <div>
      <div className="text-[11px] font-semibold uppercase tracking-wide text-slate-400">{label}</div>
      <div className="mt-0.5 font-medium">{value}</div>
    </div>
  )
}
