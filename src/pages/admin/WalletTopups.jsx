import { useCallback, useEffect, useState } from 'react'
import { Search, Check, X, Wallet } from 'lucide-react'
import api from '../../api/axios'
import Card from '../../components/ui/Card'
import StatusBadge from '../../components/ui/StatusBadge'
import Pagination from '../../components/ui/Pagination'
import Toast from '../../components/ui/Toast'
import { inputClass } from '../../components/ui/Input'
import { formatINR, formatDate } from '../../utils/format'
import { getErrorMessage } from '../../utils/errors'

const TABS = [
  { key: 'pending', label: 'Pending' },
  { key: 'approved', label: 'Approved' },
  { key: 'rejected', label: 'Rejected' },
  { key: '', label: 'All' },
]

export default function WalletTopups() {
  const [rows, setRows] = useState([])
  const [meta, setMeta] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  const [tab, setTab] = useState('pending')
  const [search, setSearch] = useState('')
  const [debouncedSearch, setDebouncedSearch] = useState('')
  const [page, setPage] = useState(1)
  const [reloadKey, setReloadKey] = useState(0)

  const [busyId, setBusyId] = useState(null)
  const [toast, setToast] = useState(null)
  const closeToast = useCallback(() => setToast(null), [])

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
      .get('/admin/topups', { params: { status: tab, search: debouncedSearch, page } })
      .then((res) => {
        if (cancelled) return
        const { data, ...pagination } = res.data
        setRows(data)
        setMeta(pagination)
      })
      .catch((err) => !cancelled && setError(getErrorMessage(err, 'Unable to load top-up requests.')))
      .finally(() => !cancelled && setLoading(false))

    return () => {
      cancelled = true
    }
  }, [tab, debouncedSearch, page, reloadKey])

  const decide = async (row, action) => {
    const question =
      action === 'approve'
        ? `Approve ${formatINR(row.amount)} for ${row.business_name}?\n\nCheck UTR ${row.utr} in your bank statement first. The amount will be added to their wallet.`
        : `Reject ${formatINR(row.amount)} request from ${row.business_name}?`

    if (!window.confirm(question)) return

    setBusyId(row.id)
    try {
      await api.post(`/admin/topups/${row.id}/${action}`)
      setToast({ type: 'success', text: action === 'approve' ? 'Approved. Wallet credited.' : 'Request rejected.' })
      setReloadKey((k) => k + 1)
    } catch (err) {
      setToast({ type: 'error', text: getErrorMessage(err) })
      setReloadKey((k) => k + 1) // refresh, the request may have been processed already
    } finally {
      setBusyId(null)
      window.dispatchEvent(new Event('badges:refresh'))
    }
  }

  return (
    <div className="space-y-6">
      <Toast toast={toast} onClose={closeToast} />

      <div>
        <h1 className="text-2xl font-bold text-slate-900 dark:text-white">Wallet Top-ups</h1>
        <p className="text-sm text-slate-500 dark:text-slate-400">Approve or reject money added by retailers.</p>
      </div>

      <Card>
        <div className="mb-4 flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
          <div className="inline-flex rounded-xl bg-slate-100 p-1 dark:bg-slate-800">
            {TABS.map((t) => (
              <button
                key={t.label}
                onClick={() => {
                  setTab(t.key)
                  setPage(1)
                }}
                className={`rounded-lg px-4 py-1.5 text-sm font-semibold transition ${
                  tab === t.key
                    ? 'bg-brand-700 text-white'
                    : 'text-slate-600 hover:text-slate-900 dark:text-slate-300 dark:hover:text-white'
                }`}
              >
                {t.label}
              </button>
            ))}
          </div>

          <div className="relative lg:w-80">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search by business or UTR"
              className={`${inputClass} pl-9`}
            />
          </div>
        </div>

        {error && <p className="mb-3 text-sm text-red-600">{error}</p>}

        <div className="overflow-x-auto">
          <table className="w-full min-w-[820px] text-left text-sm">
            <thead>
              <tr className="border-b border-slate-100 text-xs uppercase tracking-wide text-slate-400 dark:border-slate-800">
                <th className="pb-3 font-semibold">Retailer</th>
                <th className="pb-3 font-semibold">Amount</th>
                <th className="pb-3 font-semibold">Method</th>
                <th className="pb-3 font-semibold">UTR</th>
                <th className="pb-3 font-semibold">Requested</th>
                <th className="pb-3 font-semibold">Status</th>
                <th className="pb-3 text-right font-semibold">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
              {loading && (
                <tr><td colSpan="7" className="py-10 text-center text-slate-400">Loading requests...</td></tr>
              )}

              {!loading && rows.length === 0 && (
                <tr>
                  <td colSpan="7" className="py-12 text-center text-slate-400">
                    <Wallet className="mx-auto mb-2 h-8 w-8" />
                    No top-up requests found.
                  </td>
                </tr>
              )}

              {!loading &&
                rows.map((r) => (
                  <tr key={r.id} className="text-slate-700 dark:text-slate-200">
                    <td className="py-3 font-semibold">{r.business_name}</td>
                    <td className="py-3 font-semibold">{formatINR(r.amount)}</td>
                    <td className="py-3">{r.method}</td>
                    <td className="py-3 font-mono text-xs">{r.utr}</td>
                    <td className="py-3">{formatDate(r.created_at)}</td>
                    <td className="py-3">
                      <StatusBadge status={r.status} />
                      {r.decided_by && <div className="mt-1 text-[11px] text-slate-400">by {r.decided_by}</div>}
                    </td>
                    <td className="py-3">
                      {r.status === 'pending' && (
                        <div className="flex justify-end gap-2">
                          <button
                            onClick={() => decide(r, 'approve')}
                            disabled={busyId === r.id}
                            className="inline-flex items-center gap-1 rounded-lg bg-brand-700 px-3 py-1.5 text-xs font-semibold text-white hover:bg-brand-800 disabled:opacity-60"
                          >
                            <Check className="h-3.5 w-3.5" /> Approve
                          </button>
                          <button
                            onClick={() => decide(r, 'reject')}
                            disabled={busyId === r.id}
                            className="inline-flex items-center gap-1 rounded-lg border border-red-200 px-3 py-1.5 text-xs font-semibold text-red-600 hover:bg-red-50 disabled:opacity-60 dark:border-red-900 dark:hover:bg-red-950"
                          >
                            <X className="h-3.5 w-3.5" /> Reject
                          </button>
                        </div>
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
