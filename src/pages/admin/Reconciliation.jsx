import { useCallback, useEffect, useState } from 'react'
import { Search, Scale, AlertTriangle, CheckCircle2, RotateCcw } from 'lucide-react'
import api from '../../api/axios'
import Card from '../../components/ui/Card'
import Modal from '../../components/ui/Modal'
import Input, { inputClass } from '../../components/ui/Input'
import Pagination from '../../components/ui/Pagination'
import Toast from '../../components/ui/Toast'
import { formatINR } from '../../utils/format'
import { getErrorMessage, getFieldErrors } from '../../utils/errors'

const TABS = [
  { key: 'open', label: 'Open' },
  { key: 'resolved', label: 'Resolved' },
  { key: '', label: 'All' },
]

const when = (iso) =>
  new Date(iso).toLocaleString('en-IN', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' })

const age = (hours) => (hours < 1 ? 'Under 1 hr' : hours < 48 ? `${hours} hr` : `${Math.floor(hours / 24)} days`)

function Badge({ row }) {
  if (row.status === 'open') {
    return row.overdue ? (
      <span className="inline-flex items-center gap-1 rounded-full bg-red-50 px-2.5 py-1 text-xs font-semibold text-red-700 dark:bg-red-950 dark:text-red-300">
        <AlertTriangle className="h-3 w-3" /> Overdue
      </span>
    ) : (
      <span className="rounded-full bg-amber-50 px-2.5 py-1 text-xs font-semibold text-amber-700 dark:bg-amber-950 dark:text-amber-300">Open</span>
    )
  }

  return row.outcome === 'success' ? (
    <span className="rounded-full bg-emerald-50 px-2.5 py-1 text-xs font-semibold text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300">Charged</span>
  ) : (
    <span className="rounded-full bg-slate-100 px-2.5 py-1 text-xs font-semibold text-slate-600 dark:bg-slate-800 dark:text-slate-300">Returned</span>
  )
}

// One open item: the admin checks the provider's own dashboard and decides
function ResolveModal({ row, onClose, onDone }) {
  const [outcome, setOutcome] = useState('failed')
  const [name, setName] = useState('')
  const [status, setStatus] = useState(row.fields.status_default)
  const [note, setNote] = useState('')
  const [errors, setErrors] = useState({})
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)

  const submit = async () => {
    if (busy) return

    const problems = {}
    if (note.trim().length < 5) problems.note = 'Please write a clear note (at least 5 characters). It is saved in the audit log.'
    if (outcome === 'success' && name.trim().length < 2) problems.name = `Enter the ${row.fields.name_label.toLowerCase()} shown by the provider.`
    setErrors(problems)
    setError('')
    if (Object.keys(problems).length > 0) return

    const question =
      outcome === 'success'
        ? `Charge ${formatINR(row.amount)} to ${row.business_name} and save this result?\n\nThis cannot be undone.`
        : `Return ${formatINR(row.amount)} to ${row.business_name}'s wallet?\n\nThis cannot be undone.`
    if (!window.confirm(question)) return

    setBusy(true)
    try {
      const payload = { outcome, note: note.trim() }
      if (outcome === 'success') {
        payload.name = name.trim()
        payload.status = status.trim()
      }
      const res = await api.post(`/admin/reconciliations/${row.id}/resolve`, payload)
      onDone(res.data.message)
    } catch (err) {
      const fields = getFieldErrors(err)
      setErrors(fields)
      if (Object.keys(fields).length === 0) setError(getErrorMessage(err))
      else if (fields.outcome) setError(fields.outcome)
    } finally {
      setBusy(false)
    }
  }

  const option = (value, title, text, Icon) => (
    <label
      className={`flex cursor-pointer items-start gap-3 rounded-xl border p-4 ${
        outcome === value
          ? 'border-brand-500 bg-brand-50 dark:bg-brand-950'
          : 'border-slate-200 hover:border-brand-300 dark:border-slate-700'
      }`}
    >
      <input type="radio" name="outcome" checked={outcome === value} onChange={() => setOutcome(value)} className="mt-1" />
      <span>
        <span className="flex items-center gap-2 text-sm font-semibold text-slate-900 dark:text-white">
          <Icon className="h-4 w-4" /> {title}
        </span>
        <span className="mt-0.5 block text-xs text-slate-500 dark:text-slate-400">{text}</span>
      </span>
    </label>
  )

  return (
    <Modal
      title="Resolve check"
      subtitle={`${row.request_no} · ${row.service_name} · ${row.business_name}`}
      icon={Scale}
      onClose={onClose}
      footer={
        <>
          <button onClick={onClose} className="rounded-xl border border-slate-300 px-5 py-2.5 text-sm font-semibold text-slate-700 hover:bg-slate-100 dark:border-slate-700 dark:text-slate-200 dark:hover:bg-slate-800">
            Cancel
          </button>
          <button onClick={submit} disabled={busy} className="rounded-xl bg-brand-700 px-5 py-2.5 text-sm font-semibold text-white hover:bg-brand-800 disabled:opacity-60">
            {busy ? 'Saving...' : outcome === 'success' ? 'Charge and save result' : 'Return the amount'}
          </button>
        </>
      }
    >
      <div className="space-y-4">
        <dl className="grid grid-cols-2 gap-3 rounded-xl bg-slate-50 p-4 text-sm dark:bg-slate-800/50">
          <div><dt className="text-xs text-slate-500">Checked</dt><dd className="font-mono font-semibold text-slate-900 dark:text-white">{row.input_masked}</dd></div>
          <div><dt className="text-xs text-slate-500">Amount on hold</dt><dd className="font-semibold text-slate-900 dark:text-white">{formatINR(row.amount)}</dd></div>
          <div><dt className="text-xs text-slate-500">Raised</dt><dd className="text-slate-900 dark:text-white">{when(row.created_at)} ({age(row.age_hours)} ago)</dd></div>
          <div><dt className="text-xs text-slate-500">Reason</dt><dd className="text-slate-900 dark:text-white">{row.reason}</dd></div>
        </dl>

        <p className="text-xs text-slate-500 dark:text-slate-400">
          Look this request up in the provider's own dashboard, then choose what really happened. Do not guess:
          the choice moves real money.
        </p>

        {error && <div className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700 dark:bg-red-950 dark:text-red-300">{error}</div>}

        <div className="space-y-3">
          {option('failed', 'The provider did NOT process it', 'The held amount goes back to the retailer. The check is closed as failed.', RotateCcw)}
          {option('success', 'The provider DID process it', 'Enter the answer from the provider. The held amount is charged and the retailer sees the result.', CheckCircle2)}
        </div>

        {outcome === 'success' && (
          <div className="grid gap-4 sm:grid-cols-2">
            <Input
              label={row.fields.name_label}
              value={name}
              onChange={(e) => setName(e.target.value)}
              error={errors.name}
              placeholder="As shown by the provider"
            />
            <Input
              label={row.fields.status_label}
              value={status}
              onChange={(e) => setStatus(e.target.value)}
              error={errors.status}
            />
          </div>
        )}

        <div>
          <label className="mb-1.5 block text-xs font-semibold text-slate-600 dark:text-slate-300">Note (saved in the audit log)</label>
          <textarea
            value={note}
            onChange={(e) => setNote(e.target.value.slice(0, 200))}
            rows={2}
            placeholder="Example: Provider dashboard shows no record for this request."
            className={`${inputClass} ${errors.note ? 'border-red-400' : ''}`}
          />
          {errors.note && <p className="mt-1 text-xs text-red-600">{errors.note}</p>}
        </div>
      </div>
    </Modal>
  )
}

export default function Reconciliation() {
  const [rows, setRows] = useState([])
  const [meta, setMeta] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  const [tab, setTab] = useState('open')
  const [search, setSearch] = useState('')
  const [debouncedSearch, setDebouncedSearch] = useState('')
  const [page, setPage] = useState(1)
  const [reloadKey, setReloadKey] = useState(0)

  const [resolving, setResolving] = useState(null)
  const [toast, setToast] = useState(null)
  const closeToast = useCallback(() => setToast(null), [])

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
      .get('/admin/reconciliations', { params: { status: tab, search: debouncedSearch, page } })
      .then((res) => {
        if (cancelled) return
        const { data, ...pagination } = res.data
        setRows(data)
        setMeta(pagination)
      })
      .catch((err) => !cancelled && setError(getErrorMessage(err, 'Unable to load reconciliation items.')))
      .finally(() => !cancelled && setLoading(false))

    return () => {
      cancelled = true
    }
  }, [tab, debouncedSearch, page, reloadKey])

  const done = (message) => {
    setResolving(null)
    setToast({ type: 'success', text: message })
    setReloadKey((k) => k + 1)
    window.dispatchEvent(new Event('badges:refresh'))
  }

  return (
    <div className="space-y-6">
      <Toast toast={toast} onClose={closeToast} />

      <div>
        <h1 className="text-2xl font-bold text-slate-900 dark:text-white">Reconciliation</h1>
        <p className="text-sm text-slate-500 dark:text-slate-400">
          Checks where the provider did not answer in time. The retailer's money stays on hold until you resolve each one.
        </p>
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
                  tab === t.key ? 'bg-brand-700 text-white' : 'text-slate-600 hover:text-slate-900 dark:text-slate-300 dark:hover:text-white'
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
              placeholder="Search business, request no. or document"
              className={`${inputClass} pl-9`}
            />
          </div>
        </div>

        {error && <p className="mb-3 text-sm text-red-600">{error}</p>}

        <div className="overflow-x-auto">
          <table className="w-full min-w-[900px] text-left text-sm">
            <thead>
              <tr className="border-b border-slate-100 text-xs uppercase tracking-wide text-slate-400 dark:border-slate-800">
                <th className="pb-3 font-semibold">Request</th>
                <th className="pb-3 font-semibold">Retailer</th>
                <th className="pb-3 font-semibold">Service</th>
                <th className="pb-3 font-semibold">Checked</th>
                <th className="pb-3 font-semibold">On hold</th>
                <th className="pb-3 font-semibold">Raised</th>
                <th className="pb-3 font-semibold">Status</th>
                <th className="pb-3 text-right font-semibold">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
              {loading && <tr><td colSpan="8" className="py-10 text-center text-slate-400">Loading...</td></tr>}

              {!loading && rows.length === 0 && (
                <tr>
                  <td colSpan="8" className="py-12 text-center text-slate-400">
                    <Scale className="mx-auto mb-2 h-8 w-8" />
                    {tab === 'open' ? 'Nothing to reconcile. All checks are settled.' : 'No items found.'}
                  </td>
                </tr>
              )}

              {!loading &&
                rows.map((r) => (
                  <tr key={r.id} className="text-slate-700 dark:text-slate-200">
                    <td className="py-3 font-mono text-xs font-semibold">{r.request_no}</td>
                    <td className="py-3 font-semibold">{r.business_name}</td>
                    <td className="py-3">{r.service_name}</td>
                    <td className="py-3 font-mono text-xs">{r.input_masked}</td>
                    <td className="py-3">{formatINR(r.amount)}</td>
                    <td className="py-3">
                      {when(r.created_at)}
                      <div className="text-xs text-slate-400">{r.status === 'open' ? `${age(r.age_hours)} ago` : `by ${r.resolved_by ?? '-'}`}</div>
                    </td>
                    <td className="py-3"><Badge row={r} /></td>
                    <td className="py-3 text-right">
                      {r.status === 'open' ? (
                        <button
                          onClick={() => setResolving(r)}
                          className="rounded-lg bg-brand-700 px-3 py-1.5 text-xs font-semibold text-white hover:bg-brand-800"
                        >
                          Resolve
                        </button>
                      ) : (
                        <span className="text-xs text-slate-400" title={r.note ?? ''}>{r.note ? r.note.slice(0, 28) + (r.note.length > 28 ? '...' : '') : ''}</span>
                      )}
                    </td>
                  </tr>
                ))}
            </tbody>
          </table>
        </div>

        <Pagination meta={meta} onPage={setPage} />
      </Card>

      {resolving && <ResolveModal row={resolving} onClose={() => setResolving(null)} onDone={done} />}
    </div>
  )
}
