import { useCallback, useEffect, useState } from 'react'
import { Search, CreditCard, FileText, SlidersHorizontal } from 'lucide-react'
import api from '../../api/axios'
import Card from '../../components/ui/Card'
import StatusBadge from '../../components/ui/StatusBadge'
import Modal from '../../components/ui/Modal'
import Input, { inputClass } from '../../components/ui/Input'
import Pagination from '../../components/ui/Pagination'
import Toast from '../../components/ui/Toast'
import DownloadButton from '../../components/ui/DownloadButton'
import { formatINR, formatDate } from '../../utils/format'
import { getErrorMessage, getFieldErrors } from '../../utils/errors'

// One key per opened form. If the admin double clicks or the network retries, the server changes the wallet only once.
function newKey() {
  if (globalThis.crypto?.randomUUID) return crypto.randomUUID()
  const b = crypto.getRandomValues(new Uint8Array(16))
  b[6] = (b[6] & 0x0f) | 0x40
  b[8] = (b[8] & 0x3f) | 0x80
  const h = [...b].map((x) => x.toString(16).padStart(2, '0')).join('')
  return `${h.slice(0, 8)}-${h.slice(8, 12)}-${h.slice(12, 16)}-${h.slice(16, 20)}-${h.slice(20)}`
}

const TYPE_LABEL = { credit: 'Credit', debit: 'Charge', reserve: 'On hold', release: 'Hold released', reversal: 'Admin deduction' }
const SIGN = { credit: '+', debit: '-', reversal: '-' }

/* ---------- Add / deduct money ---------- */
function AdjustModal({ row, onClose, onSaved }) {
  const [key] = useState(newKey)
  const [form, setForm] = useState({ type: 'credit', amount: '', reason: '' })
  const [confirm, setConfirm] = useState(false)
  const [errors, setErrors] = useState({})
  const [formError, setFormError] = useState('')
  const [saving, setSaving] = useState(false)

  const submit = async (e) => {
    e.preventDefault()
    if (saving) return
    setErrors({})
    setFormError('')
    setSaving(true)

    try {
      const res = await api.post(`/admin/wallets/${row.retailer_id}/adjust`, { ...form, request_key: key })
      onSaved(`${res.data.message} New balance: ${formatINR(res.data.balance_after)}`)
    } catch (err) {
      const fieldErrors = getFieldErrors(err)
      setErrors(fieldErrors)
      if (Object.keys(fieldErrors).length === 0) setFormError(getErrorMessage(err))
    } finally {
      setSaving(false)
    }
  }

  const isCredit = form.type === 'credit'

  return (
    <Modal
      title="Adjust wallet"
      subtitle={`${row.business_name} - available ${formatINR(row.available)}`}
      icon={SlidersHorizontal}
      onClose={onClose}
      footer={
        <>
          <button type="button" onClick={onClose} className="rounded-xl px-4 py-2.5 text-sm font-semibold text-slate-600 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800">
            Cancel
          </button>
          <button
            type="submit"
            form="adjust-form"
            disabled={saving || !confirm}
            className={`rounded-xl px-4 py-2.5 text-sm font-semibold text-white disabled:cursor-not-allowed disabled:opacity-50 ${isCredit ? 'bg-brand-700 hover:bg-brand-800' : 'bg-red-600 hover:bg-red-700'}`}
          >
            {saving ? 'Saving...' : isCredit ? 'Add money' : 'Deduct money'}
          </button>
        </>
      }
    >
      <form id="adjust-form" onSubmit={submit} className="space-y-4" autoComplete="off">
        {formError && <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700 dark:bg-red-950 dark:text-red-300">{formError}</p>}

        <div className="inline-flex rounded-xl bg-slate-100 p-1 dark:bg-slate-800">
          {[['credit', 'Add money'], ['debit', 'Deduct money']].map(([value, label]) => (
            <button
              type="button"
              key={value}
              onClick={() => setForm({ ...form, type: value })}
              className={`rounded-lg px-4 py-1.5 text-sm font-semibold ${form.type === value ? (value === 'credit' ? 'bg-brand-700 text-white' : 'bg-red-600 text-white') : 'text-slate-600 dark:text-slate-300'}`}
            >
              {label}
            </button>
          ))}
        </div>

        <Input
          label="Amount (Rs)"
          value={form.amount}
          onChange={(e) => setForm({ ...form, amount: e.target.value.replace(/[^\d.]/g, '') })}
          error={errors.amount}
          inputMode="decimal"
          placeholder="Between 1 and 1,00,000"
          required
        />

        <div>
          <label className="mb-1.5 block text-xs font-semibold text-slate-600 dark:text-slate-300">Reason (saved in the audit log)</label>
          <textarea
            rows={3}
            maxLength={200}
            value={form.reason}
            onChange={(e) => setForm({ ...form, reason: e.target.value })}
            className={`${inputClass} ${errors.reason ? 'border-red-400' : ''}`}
            placeholder="Example: Bank receipt checked offline, UTR 123456789"
            required
          />
          {errors.reason && <p className="mt-1 text-xs text-red-600">{errors.reason}</p>}
        </div>

        <label className="flex items-start gap-2 text-sm text-slate-700 dark:text-slate-200">
          <input type="checkbox" checked={confirm} onChange={(e) => setConfirm(e.target.checked)} className="mt-1" />
          <span>
            I confirm that I want to {isCredit ? 'add' : 'deduct'} this amount {isCredit ? 'to' : 'from'} <b>{row.business_name}</b>. This action cannot be undone, it can only be corrected by a new entry.
          </span>
        </label>
      </form>
    </Modal>
  )
}

/* ---------- Statement of one retailer ---------- */
function LedgerModal({ row, onClose, onError }) {
  const [rows, setRows] = useState([])
  const [meta, setMeta] = useState(null)
  const [loading, setLoading] = useState(true)
  const [from, setFrom] = useState('')
  const [to, setTo] = useState('')
  const [page, setPage] = useState(1)

  useEffect(() => {
    let cancelled = false
    setLoading(true)

    api
      .get(`/admin/wallets/${row.retailer_id}/ledger`, { params: { from, to, page } })
      .then((res) => {
        if (cancelled) return
        const { data, ...pagination } = res.data
        setRows(data)
        setMeta(pagination)
      })
      .catch((err) => !cancelled && onError(getErrorMessage(err, 'Unable to load the statement.')))
      .finally(() => !cancelled && setLoading(false))

    return () => {
      cancelled = true
    }
  }, [row.retailer_id, from, to, page, onError])

  return (
    <Modal title="Wallet statement" subtitle={row.business_name} icon={FileText} size="2xl" onClose={onClose}>
      <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-end">
        <Input label="From" type="date" value={from} max={to || undefined} onChange={(e) => { setFrom(e.target.value); setPage(1) }} className="sm:w-44" />
        <Input label="To" type="date" value={to} min={from || undefined} onChange={(e) => { setTo(e.target.value); setPage(1) }} className="sm:w-44" />
        <div className="sm:ml-auto">
          <DownloadButton
            url={`/admin/wallets/${row.retailer_id}/export`}
            params={{ from, to }}
            filename={`wallet-statement-${row.retailer_id}.csv`}
            onError={onError}
          />
        </div>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full min-w-[560px] text-left text-sm">
          <thead>
            <tr className="border-b border-slate-100 text-xs uppercase tracking-wide text-slate-400 dark:border-slate-800">
              <th className="pb-3 font-semibold">Date</th>
              <th className="pb-3 font-semibold">Description</th>
              <th className="pb-3 font-semibold">Type</th>
              <th className="pb-3 text-right font-semibold">Amount</th>
              <th className="pb-3 text-right font-semibold">Balance</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
            {loading && <tr><td colSpan="5" className="py-8 text-center text-slate-400">Loading...</td></tr>}
            {!loading && rows.length === 0 && <tr><td colSpan="5" className="py-8 text-center text-slate-400">No transactions found.</td></tr>}
            {!loading &&
              rows.map((r) => (
                <tr key={r.id} className="text-slate-700 dark:text-slate-200">
                  <td className="py-3">{formatDate(r.created_at)}</td>
                  <td className="py-3">{r.description ?? '-'}</td>
                  <td className="py-3">{TYPE_LABEL[r.type] ?? r.type}</td>
                  <td className={`py-3 text-right font-semibold ${r.type === 'credit' ? 'text-brand-600' : r.type === 'debit' || r.type === 'reversal' ? 'text-red-600' : ''}`}>
                    {SIGN[r.type] ?? ''}{formatINR(r.amount)}
                  </td>
                  <td className="py-3 text-right">{formatINR(r.balance_after)}</td>
                </tr>
              ))}
          </tbody>
        </table>
      </div>

      <Pagination meta={meta} onPage={setPage} />
    </Modal>
  )
}

/* ---------- Page ---------- */
export default function WalletControl() {
  const [rows, setRows] = useState([])
  const [meta, setMeta] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [toast, setToast] = useState(null)
  const closeToast = useCallback(() => setToast(null), [])
  const showError = useCallback((text) => setToast({ type: 'error', text }), [])

  const [search, setSearch] = useState('')
  const [debouncedSearch, setDebouncedSearch] = useState('')
  const [page, setPage] = useState(1)
  const [reload, setReload] = useState(0)

  const [adjusting, setAdjusting] = useState(null)
  const [viewing, setViewing] = useState(null)

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
      .get('/admin/wallets', { params: { search: debouncedSearch, page } })
      .then((res) => {
        if (cancelled) return
        const { data, ...pagination } = res.data
        setRows(data)
        setMeta(pagination)
      })
      .catch((err) => !cancelled && setError(getErrorMessage(err, 'Unable to load wallets.')))
      .finally(() => !cancelled && setLoading(false))

    return () => {
      cancelled = true
    }
  }, [debouncedSearch, page, reload])

  const saved = (message) => {
    setAdjusting(null)
    setToast({ type: 'success', text: message })
    setReload((n) => n + 1)
  }

  return (
    <div className="space-y-6">
      <Toast toast={toast} onClose={closeToast} />

      <div>
        <h1 className="text-2xl font-bold text-slate-900 dark:text-white">Retailer Wallets</h1>
        <p className="text-sm text-slate-500 dark:text-slate-400">Balances of every retailer. Manual changes always need a reason and are written to the audit log.</p>
      </div>

      <Card>
        <div className="relative mb-4 sm:max-w-sm">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
          <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search retailer, owner or mobile" className={`${inputClass} pl-9`} />
        </div>

        {error && <p className="mb-3 text-sm text-red-600">{error}</p>}

        <div className="overflow-x-auto">
          <table className="w-full min-w-[720px] text-left text-sm">
            <thead>
              <tr className="border-b border-slate-100 text-xs uppercase tracking-wide text-slate-400 dark:border-slate-800">
                <th className="pb-3 font-semibold">Retailer</th>
                <th className="pb-3 font-semibold">Status</th>
                <th className="pb-3 text-right font-semibold">Available</th>
                <th className="pb-3 text-right font-semibold">On hold</th>
                <th className="pb-3 text-right font-semibold">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
              {loading && <tr><td colSpan="5" className="py-10 text-center text-slate-400">Loading...</td></tr>}
              {!loading && rows.length === 0 && <tr><td colSpan="5" className="py-10 text-center text-slate-400">No retailers found.</td></tr>}
              {!loading &&
                rows.map((r) => (
                  <tr key={r.retailer_id} className="text-slate-700 dark:text-slate-200">
                    <td className="py-3">
                      <div className="flex items-center gap-2 font-semibold"><CreditCard className="h-4 w-4 text-slate-400" />{r.business_name}</div>
                      <div className="text-xs text-slate-400">{r.owner}</div>
                    </td>
                    <td className="py-3"><StatusBadge status={r.status} /></td>
                    <td className="py-3 text-right font-semibold">{formatINR(r.available)}</td>
                    <td className="py-3 text-right">{formatINR(r.reserved)}</td>
                    <td className="py-3 text-right">
                      <div className="inline-flex gap-2">
                        <button onClick={() => setViewing(r)} className="rounded-lg border border-slate-200 px-3 py-1.5 text-xs font-semibold hover:bg-slate-50 dark:border-slate-700 dark:hover:bg-slate-800">Statement</button>
                        <button onClick={() => setAdjusting(r)} className="rounded-lg bg-brand-700 px-3 py-1.5 text-xs font-semibold text-white hover:bg-brand-800">Adjust</button>
                      </div>
                    </td>
                  </tr>
                ))}
            </tbody>
          </table>
        </div>

        <Pagination meta={meta} onPage={setPage} />
      </Card>

      {adjusting && <AdjustModal row={adjusting} onClose={() => setAdjusting(null)} onSaved={saved} />}
      {viewing && <LedgerModal row={viewing} onClose={() => setViewing(null)} onError={showError} />}
    </div>
  )
}
