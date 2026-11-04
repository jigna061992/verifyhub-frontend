import { useCallback, useEffect, useState } from 'react'
import { Search, CreditCard, FileText, SlidersHorizontal, ArrowDownLeft, ArrowUpRight, Hash, RefreshCw, ShieldCheck, Plus } from 'lucide-react'
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

const MODES = [
  ['NEFT', 'NEFT'], ['IMPS', 'IMPS'], ['RTGS', 'RTGS'], ['UPI', 'UPI'],
  ['CASH', 'Cash'], ['CHEQUE', 'Cheque'], ['OTHER', 'Other'],
]
const QUICK_AMOUNTS = [500, 1000, 2000, 5000, 10000]

// Suggested bank reference. The admin can replace it with the real UTR / receipt number.
function makeReference(type) {
  const d = new Date()
  const date = `${String(d.getFullYear()).slice(2)}${String(d.getMonth() + 1).padStart(2, '0')}${String(d.getDate()).padStart(2, '0')}`
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'
  const rnd = Array.from(crypto.getRandomValues(new Uint8Array(5)), (x) => chars[x % chars.length]).join('')
  return `${type === 'credit' ? 'VHCR' : 'VHDR'}${date}${rnd}`
}

const labelClass = 'mb-1.5 block text-xs font-semibold text-slate-600 dark:text-slate-300'

/* ---------- Wallet adjustment (add or deduct money) ---------- */
function AdjustModal({ preset, onClose, onSaved }) {
  const [key] = useState(newKey)
  const [retailers, setRetailers] = useState(preset ? [preset] : [])
  const [retailerId, setRetailerId] = useState(preset ? String(preset.retailer_id) : '')
  const [type, setType] = useState('credit')
  const [amount, setAmount] = useState('')
  const [mode, setMode] = useState('NEFT')
  const [reference, setReference] = useState(() => makeReference('credit'))
  const [remarks, setRemarks] = useState('')
  const [step, setStep] = useState('form') // form -> review
  const [errors, setErrors] = useState({})
  const [formError, setFormError] = useState('')
  const [saving, setSaving] = useState(false)

  // All retailers for the dropdown (balances come with the list)
  useEffect(() => {
    api.get('/admin/wallets', { params: { per_page: 100 } })
      .then((res) => setRetailers(res.data.data))
      .catch(() => {})
  }, [])

  const row = retailers.find((r) => String(r.retailer_id) === retailerId)
  const isCredit = type === 'credit'
  const value = Number(amount) || 0
  const current = row?.available ?? 0
  const after = isCredit ? current + value : current - value

  const switchType = (next) => {
    setType(next)
    // keep a generated reference in step with the type, but never overwrite one the admin typed
    if (/^VH(CR|DR)\d{6}[A-Z0-9]{5}$/.test(reference)) setReference(makeReference(next))
  }

  // Checks done on the screen. The server checks everything again.
  const validate = () => {
    const e = {}
    if (!retailerId) e.retailer = 'Select a retailer.'
    if (!(value >= 1)) e.amount = 'Enter an amount greater than zero.'
    else if (value > 100000) e.amount = 'The limit is ₹1,00,000 per entry.'
    else if (!isCredit && value > current) e.amount = 'This is more than the available balance.'
    if (!/^[A-Za-z0-9\-_/]{6,40}$/.test(reference.trim())) e.txn_reference = 'Enter 6 to 40 letters or numbers.'
    setErrors(e)
    return Object.keys(e).length === 0
  }

  const review = (ev) => {
    ev.preventDefault()
    if (validate()) setStep('review')
  }

  const save = async () => {
    if (saving) return
    setFormError('')
    setSaving(true)

    try {
      const res = await api.post(`/admin/wallets/${retailerId}/adjust`, {
        type, amount: value, payment_mode: mode, txn_reference: reference.trim(), remarks: remarks.trim(), request_key: key,
      })
      onSaved(`${res.data.message} New balance: ${formatINR(res.data.balance_after)}`)
    } catch (err) {
      const fieldErrors = getFieldErrors(err)
      if (Object.keys(fieldErrors).length > 0) {
        setErrors(fieldErrors)
        setStep('form') // show the message next to the field
      } else {
        setFormError(getErrorMessage(err))
      }
    } finally {
      setSaving(false)
    }
  }

  const summary = (
    <div className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm dark:border-slate-700 dark:bg-slate-950">
      {[
        ['Current balance', formatINR(current), ''],
        [isCredit ? 'Credit amount' : 'Debit amount', `${isCredit ? '+' : '-'}${formatINR(value)}`, isCredit ? 'text-emerald-600' : 'text-red-600'],
      ].map(([label, text, tone]) => (
        <div key={label} className="flex items-center justify-between border-b border-dashed border-slate-200 py-2 dark:border-slate-700">
          <span className="text-slate-600 dark:text-slate-300">{label}</span>
          <span className={`font-semibold ${tone || 'text-slate-900 dark:text-white'}`}>{text}</span>
        </div>
      ))}
      <div className="flex items-center justify-between pt-2">
        <span className="font-semibold text-slate-900 dark:text-white">Balance after adjustment</span>
        <span className="text-base font-bold text-slate-900 dark:text-white">{formatINR(after)}</span>
      </div>
    </div>
  )

  return (
    <Modal
      title="Wallet adjustment"
      subtitle="Credit or debit a retailer wallet. Write the real payment details of the money."
      icon={SlidersHorizontal}
      onClose={onClose}
      footer={
        step === 'form' ? (
          <>
            <button type="button" onClick={onClose} className="rounded-xl border border-slate-300 px-4 py-2.5 text-sm font-semibold text-slate-700 hover:bg-white dark:border-slate-700 dark:text-slate-200 dark:hover:bg-slate-800">
              Cancel
            </button>
            <button type="submit" form="adjust-form" className="inline-flex items-center gap-2 rounded-xl bg-brand-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-brand-700">
              <ShieldCheck className="h-4 w-4" /> Review &amp; confirm
            </button>
          </>
        ) : (
          <>
            <button type="button" onClick={() => setStep('form')} disabled={saving} className="rounded-xl border border-slate-300 px-4 py-2.5 text-sm font-semibold text-slate-700 hover:bg-white disabled:opacity-50 dark:border-slate-700 dark:text-slate-200 dark:hover:bg-slate-800">
              Back
            </button>
            <button type="button" onClick={save} disabled={saving} className={`rounded-xl px-4 py-2.5 text-sm font-semibold text-white disabled:cursor-not-allowed disabled:opacity-60 ${isCredit ? 'bg-brand-600 hover:bg-brand-700' : 'bg-red-600 hover:bg-red-700'}`}>
              {saving ? 'Saving...' : isCredit ? 'Confirm & add money' : 'Confirm & deduct money'}
            </button>
          </>
        )
      }
    >
      {formError && <p className="mb-4 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700 dark:bg-red-950 dark:text-red-300">{formError}</p>}

      {step === 'review' ? (
        <div className="space-y-4">
          <p className="text-sm text-slate-600 dark:text-slate-300">
            Please check the details. This entry cannot be edited later, it can only be corrected with a new entry.
          </p>
          <dl className="divide-y divide-slate-100 rounded-xl border border-slate-200 text-sm dark:divide-slate-800 dark:border-slate-700">
            {[
              ['Retailer', `${row?.business_name} · ${row?.code}`],
              ['Type', isCredit ? 'Add balance (Credit)' : 'Deduct (Debit)'],
              ['Payment mode', MODES.find((m) => m[0] === mode)?.[1]],
              ['Transaction reference', reference.trim().toUpperCase()],
              ['Remarks', remarks.trim() || '-'],
            ].map(([k, v]) => (
              <div key={k} className="flex justify-between gap-4 px-4 py-2.5">
                <dt className="text-slate-500 dark:text-slate-400">{k}</dt>
                <dd className="text-right font-semibold text-slate-900 dark:text-white">{v}</dd>
              </div>
            ))}
          </dl>
          {summary}
        </div>
      ) : (
        <form id="adjust-form" onSubmit={review} className="space-y-4" autoComplete="off" noValidate>
          <div>
            <label className={labelClass}>Retailer <span className="text-red-500">*</span></label>
            <select
              value={retailerId}
              onChange={(e) => setRetailerId(e.target.value)}
              className={`${inputClass} ${errors.retailer ? 'border-red-400' : ''}`}
            >
              <option value="">Select retailer</option>
              {retailers.map((r) => (
                <option key={r.retailer_id} value={r.retailer_id}>{r.business_name} · {r.code}</option>
              ))}
            </select>
            {errors.retailer && <p className="mt-1 text-xs text-red-600">{errors.retailer}</p>}
          </div>

          <div className="grid grid-cols-2 gap-1 rounded-xl bg-slate-100 p-1 dark:bg-slate-800">
            {[['credit', 'Add balance (Credit)', ArrowDownLeft, 'text-emerald-600'], ['debit', 'Deduct (Debit)', ArrowUpRight, 'text-slate-600 dark:text-slate-300']].map(([v, label, Icon, tone]) => (
              <button
                key={v}
                type="button"
                onClick={() => switchType(v)}
                className={`flex items-center justify-center gap-2 rounded-lg py-2.5 text-sm font-semibold transition ${type === v ? `bg-white shadow dark:bg-slate-700 ${v === 'debit' ? 'text-red-600 dark:text-red-400' : tone}` : 'text-slate-500 dark:text-slate-400'}`}
              >
                <Icon className="h-4 w-4" /> {label}
              </button>
            ))}
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label className={labelClass}>Amount <span className="text-red-500">*</span></label>
              <div className="flex">
                <span className="flex items-center rounded-l-xl border border-r-0 border-slate-300 bg-slate-50 px-3 text-sm text-slate-500 dark:border-slate-700 dark:bg-slate-800">₹</span>
                <input
                  value={amount}
                  onChange={(e) => setAmount(e.target.value.replace(/[^\d.]/g, ''))}
                  inputMode="decimal"
                  placeholder="0"
                  className={`${inputClass} rounded-l-none ${errors.amount ? 'border-red-400' : ''}`}
                />
              </div>
            </div>
            <div>
              <label className={labelClass}>Payment mode</label>
              <select value={mode} onChange={(e) => setMode(e.target.value)} className={inputClass}>
                {MODES.map(([v, l]) => <option key={v} value={v}>{l}</option>)}
              </select>
            </div>
          </div>
          <div className="-mt-2 flex flex-wrap gap-2">
            {QUICK_AMOUNTS.map((n) => (
              <button key={n} type="button" onClick={() => setAmount(String(n))} className="rounded-full border border-slate-300 px-3 py-1 text-xs font-semibold text-slate-700 hover:bg-slate-50 dark:border-slate-700 dark:text-slate-200 dark:hover:bg-slate-800">
                ₹{n.toLocaleString('en-IN')}
              </button>
            ))}
          </div>
          {errors.amount && <p className="-mt-2 text-xs text-red-600">{errors.amount}</p>}
          {errors.payment_mode && <p className="-mt-2 text-xs text-red-600">{errors.payment_mode}</p>}

          <div>
            <label className={labelClass}>Transaction reference number <span className="text-red-500">*</span></label>
            <div className="relative">
              <Hash className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
              <input
                value={reference}
                onChange={(e) => setReference(e.target.value.toUpperCase())}
                maxLength={40}
                className={`${inputClass} pl-9 pr-10 font-mono text-sm ${errors.txn_reference ? 'border-red-400' : ''}`}
              />
              <button type="button" onClick={() => setReference(makeReference(type))} title="Generate a new reference" className="absolute right-2 top-1/2 -translate-y-1/2 rounded-md p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-600 dark:hover:bg-slate-800">
                <RefreshCw className="h-4 w-4" />
              </button>
            </div>
            {errors.txn_reference
              ? <p className="mt-1 text-xs text-red-600">{errors.txn_reference}</p>
              : <p className="mt-1 text-xs text-slate-400">Use the bank UTR / receipt number. The same reference cannot be used twice.</p>}
          </div>

          <div>
            <label className={`${labelClass} flex justify-between`}>Remarks <span className="font-normal text-slate-400">Optional</span></label>
            <textarea
              rows={3}
              maxLength={200}
              value={remarks}
              onChange={(e) => setRemarks(e.target.value)}
              placeholder="e.g. Top-up against bank transfer"
              className={inputClass}
            />
          </div>

          {summary}
        </form>
      )}
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

      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-white">Retailer Wallets</h1>
          <p className="text-sm text-slate-500 dark:text-slate-400">Balances of every retailer. Manual changes need a payment mode and a bank reference, and are written to the audit log.</p>
        </div>
        <button onClick={() => setAdjusting({})} className="inline-flex items-center gap-2 rounded-xl bg-brand-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-brand-700">
          <Plus className="h-4 w-4" /> Wallet adjustment
        </button>
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

      {adjusting && <AdjustModal preset={adjusting.retailer_id ? adjusting : null} onClose={() => setAdjusting(null)} onSaved={saved} />}
      {viewing && <LedgerModal row={viewing} onClose={() => setViewing(null)} onError={showError} />}
    </div>
  )
}
