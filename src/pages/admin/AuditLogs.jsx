import { useEffect, useState } from 'react'
import { Search, ScrollText } from 'lucide-react'
import api from '../../api/axios'
import Card from '../../components/ui/Card'
import Pagination from '../../components/ui/Pagination'
import Input, { inputClass } from '../../components/ui/Input'
import { getErrorMessage } from '../../utils/errors'

const dateTime = (iso) =>
  new Date(iso).toLocaleString('en-IN', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })

// {"amount":500,"type":"credit"} -> "amount: 500, type: credit"
const summary = (meta) =>
  meta && typeof meta === 'object'
    ? Object.entries(meta).map(([k, v]) => `${k.replace(/_/g, ' ')}: ${typeof v === 'object' ? JSON.stringify(v) : v}`).join(', ')
    : '-'

export default function AuditLogs() {
  const [rows, setRows] = useState([])
  const [meta, setMeta] = useState(null)
  const [actions, setActions] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  const [search, setSearch] = useState('')
  const [debouncedSearch, setDebouncedSearch] = useState('')
  const [action, setAction] = useState('')
  const [from, setFrom] = useState('')
  const [to, setTo] = useState('')
  const [page, setPage] = useState(1)

  useEffect(() => {
    api.get('/admin/audit-logs/actions').then((res) => setActions(res.data)).catch(() => {})
  }, [])

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
      .get('/admin/audit-logs', { params: { search: debouncedSearch, action, from, to, page } })
      .then((res) => {
        if (cancelled) return
        const { data, ...pagination } = res.data
        setRows(data)
        setMeta(pagination)
      })
      .catch((err) => !cancelled && setError(getErrorMessage(err, 'Unable to load the audit log.')))
      .finally(() => !cancelled && setLoading(false))

    return () => {
      cancelled = true
    }
  }, [debouncedSearch, action, from, to, page])

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-900 dark:text-white">Audit Log</h1>
        <p className="text-sm text-slate-500 dark:text-slate-400">Who did what and when. This list is read only.</p>
      </div>

      <Card>
        <div className="mb-4 flex flex-col gap-3 lg:flex-row lg:items-end">
          <div className="relative lg:w-72">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search user, action or IP" className={`${inputClass} pl-9`} />
          </div>

          <select value={action} onChange={(e) => { setAction(e.target.value); setPage(1) }} className={`${inputClass} lg:w-56`}>
            <option value="">All actions</option>
            {actions.map((a) => <option key={a} value={a}>{a}</option>)}
          </select>

          <Input label="From" type="date" value={from} max={to || undefined} onChange={(e) => { setFrom(e.target.value); setPage(1) }} className="lg:w-40" />
          <Input label="To" type="date" value={to} min={from || undefined} onChange={(e) => { setTo(e.target.value); setPage(1) }} className="lg:w-40" />
        </div>

        {error && <p className="mb-3 text-sm text-red-600">{error}</p>}

        <div className="overflow-x-auto">
          <table className="w-full min-w-[860px] text-left text-sm">
            <thead>
              <tr className="border-b border-slate-100 text-xs uppercase tracking-wide text-slate-400 dark:border-slate-800">
                <th className="pb-3 font-semibold">When</th>
                <th className="pb-3 font-semibold">Who</th>
                <th className="pb-3 font-semibold">Action</th>
                <th className="pb-3 font-semibold">Item</th>
                <th className="pb-3 font-semibold">Details</th>
                <th className="pb-3 font-semibold">IP</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
              {loading && <tr><td colSpan="6" className="py-10 text-center text-slate-400">Loading...</td></tr>}
              {!loading && rows.length === 0 && <tr><td colSpan="6" className="py-10 text-center text-slate-400">No entries found.</td></tr>}
              {!loading &&
                rows.map((r) => (
                  <tr key={r.id} className="align-top text-slate-700 dark:text-slate-200">
                    <td className="whitespace-nowrap py-3">{dateTime(r.created_at)}</td>
                    <td className="py-3">
                      <div className="font-semibold">{r.actor}</div>
                      {r.actor_role && <div className="text-xs capitalize text-slate-400">{r.actor_role.replace('_', ' ')}</div>}
                    </td>
                    <td className="py-3"><span className="inline-flex items-center gap-1.5 font-mono text-xs"><ScrollText className="h-3.5 w-3.5 text-slate-400" />{r.action}</span></td>
                    <td className="py-3 text-xs">{r.entity_type ? `${r.entity_type} #${r.entity_id}` : '-'}</td>
                    <td className="max-w-xs break-words py-3 text-xs text-slate-500 dark:text-slate-400">{summary(r.metadata)}</td>
                    <td className="py-3 text-xs">{r.ip_address ?? '-'}</td>
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
