import { useCallback, useEffect, useState } from 'react'
import { Plus, Wallet as WalletIcon, Clock, Lock } from 'lucide-react'
import api from '../../api/axios'
import Card from '../../components/ui/Card'
import StatCard from '../../components/ui/StatCard'
import StatusBadge from '../../components/ui/StatusBadge'
import Modal from '../../components/ui/Modal'
import Input, { inputClass } from '../../components/ui/Input'
import Pagination from '../../components/ui/Pagination'
import Toast from '../../components/ui/Toast'
import DownloadButton from '../../components/ui/DownloadButton'
import { formatINR, formatDate } from '../../utils/format'
import { getErrorMessage, getFieldErrors } from '../../utils/errors'

/* ---------- Add money form (inside a modal) ---------- */
function TopupForm({ onClose, onSaved }) {
  const [form, setForm] = useState({ amount: '', method: 'UPI', utr: '' })
  const [errors, setErrors] = useState({})
  const [formError, setFormError] = useState('')
  const [saving, setSaving] = useState(false)

  const submit = async (e) => {
    e.preventDefault()
    setErrors({})
    setFormError('')
    setSaving(true)

    try {
      await api.post('/retailer/topups', form)
      onSaved('Request submitted. Your wallet will be credited after admin approval.')
    } catch (err) {
      const fieldErrors = getFieldErrors(err)
      setErrors(fieldErrors)
      if (Object.keys(fieldErrors).length === 0) setFormError(getErrorMessage(err))
    } finally {
      setSaving(false)
    }
  }

  return (
    <Modal title="Add money to wallet" onClose={onClose}>
      <form onSubmit={submit} className="space-y-4" autoComplete="off">
        <p className="rounded-lg bg-slate-50 px-3 py-2 text-xs text-slate-600 dark:bg-slate-800 dark:text-slate-300">
          First pay the amount to the VerifyHub bank account, then enter the transaction (UTR) number here.
        </p>

        {formError && (
          <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700 dark:bg-red-950 dark:text-red-300">{formError}</p>
        )}

        <Input
          label="Amount (Rs)"
          value={form.amount}
          onChange={(e) => setForm({ ...form, amount: e.target.value.replace(/[^\d.]/g, '') })}
          error={errors.amount}
          inputMode="decimal"
          placeholder="Minimum 100"
          required
        />

        <div>
          <label className="mb-1.5 block text-xs font-semibold text-slate-600 dark:text-slate-300">Payment method</label>
          <select
            value={form.method}
            onChange={(e) => setForm({ ...form, method: e.target.value })}
            className={inputClass}
          >
            <option value="UPI">UPI</option>
            <option value="NEFT">NEFT</option>
            <option value="IMPS">IMPS</option>
          </select>
          {errors.method && <p className="mt-1 text-xs text-red-600">{errors.method}</p>}
        </div>

        <Input
          label="UTR / Transaction ID"
          value={form.utr}
          onChange={(e) => setForm({ ...form, utr: e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 30) })}
          error={errors.utr}
          placeholder="e.g. 412345678901"
          required
        />

        <div className="flex justify-end gap-3 pt-2">
          <button
            type="button"
            onClick={onClose}
            className="rounded-xl border border-slate-300 px-4 py-2.5 text-sm font-semibold text-slate-700 hover:bg-slate-50 dark:border-slate-700 dark:text-slate-200 dark:hover:bg-slate-800"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={saving}
            className="rounded-xl bg-brand-700 px-5 py-2.5 text-sm font-semibold text-white hover:bg-brand-800 disabled:opacity-60"
          >
            {saving ? 'Submitting...' : 'Submit request'}
          </button>
        </div>
      </form>
    </Modal>
  )
}

const TABS = [
  { key: 'topups', label: 'Top-up requests' },
  { key: 'ledger', label: 'Transactions' },
]

const SIGN = { credit: '+', debit: '-', reversal: '-' }

/* ---------- Page ---------- */
export default function Wallet() {
  const [summary, setSummary] = useState(null)
  const [tab, setTab] = useState('topups')
  const [rows, setRows] = useState([])
  const [meta, setMeta] = useState(null)
  const [page, setPage] = useState(1)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [reloadKey, setReloadKey] = useState(0)

  const [showForm, setShowForm] = useState(false)
  const [toast, setToast] = useState(null)
  const closeToast = useCallback(() => setToast(null), [])

  useEffect(() => {
    api.get('/retailer/wallet').then((res) => setSummary(res.data)).catch(() => {})
  }, [reloadKey])

  useEffect(() => {
    let cancelled = false
    setLoading(true)
    setError('')

    api
      .get(tab === 'topups' ? '/retailer/topups' : '/retailer/wallet/ledger', { params: { page } })
      .then((res) => {
        if (cancelled) return
        const { data, ...pagination } = res.data
        setRows(data)
        setMeta(pagination)
      })
      .catch((err) => !cancelled && setError(getErrorMessage(err, 'Unable to load data.')))
      .finally(() => !cancelled && setLoading(false))

    return () => {
      cancelled = true
    }
  }, [tab, page, reloadKey])

  const handleSaved = (message) => {
    setShowForm(false)
    setToast({ type: 'success', text: message })
    setTab('topups')
    setPage(1)
    setReloadKey((k) => k + 1)
  }

  return (
    <div className="space-y-6">
      <Toast toast={toast} onClose={closeToast} />

      <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-center">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-white">Wallet</h1>
          <p className="text-sm text-slate-500 dark:text-slate-400">Add money and see every transaction.</p>
        </div>
        <div className="flex flex-col gap-3 sm:flex-row">
          <DownloadButton
            url="/retailer/export/wallet-ledger"
            filename="wallet-statement.csv"
            label="Download statement"
            onError={(text) => setToast({ type: 'error', text })}
          />
          <button
            onClick={() => setShowForm(true)}
            className="inline-flex items-center justify-center gap-2 rounded-xl bg-brand-700 px-4 py-2.5 text-sm font-semibold text-white hover:bg-brand-800"
          >
            <Plus className="h-4 w-4" /> Add money
          </button>
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        <StatCard label="Available balance" value={formatINR(summary?.available)} icon={WalletIcon} />
        <StatCard label="Reserved" value={formatINR(summary?.reserved)} icon={Lock} tone="slate" sub="Held for running verifications" />
        <StatCard label="Pending requests" value={summary?.pending_count ?? 0} icon={Clock} tone="amber" />
      </div>

      <Card>
        <div className="mb-4 inline-flex rounded-xl bg-slate-100 p-1 dark:bg-slate-800">
          {TABS.map((t) => (
            <button
              key={t.key}
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

        {error && <p className="mb-3 text-sm text-red-600">{error}</p>}

        <div className="overflow-x-auto">
          {tab === 'topups' ? (
            <table className="w-full min-w-[560px] text-left text-sm">
              <thead>
                <tr className="border-b border-slate-100 text-xs uppercase tracking-wide text-slate-400 dark:border-slate-800">
                  <th className="pb-3 font-semibold">Date</th>
                  <th className="pb-3 font-semibold">Amount</th>
                  <th className="pb-3 font-semibold">Method</th>
                  <th className="pb-3 font-semibold">UTR</th>
                  <th className="pb-3 font-semibold">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {loading && <tr><td colSpan="5" className="py-10 text-center text-slate-400">Loading...</td></tr>}
                {!loading && rows.length === 0 && (
                  <tr><td colSpan="5" className="py-10 text-center text-slate-400">No top-up requests yet.</td></tr>
                )}
                {!loading &&
                  rows.map((r) => (
                    <tr key={r.id} className="text-slate-700 dark:text-slate-200">
                      <td className="py-3">{formatDate(r.created_at)}</td>
                      <td className="py-3 font-semibold">{formatINR(r.amount)}</td>
                      <td className="py-3">{r.method}</td>
                      <td className="py-3 font-mono text-xs">{r.utr}</td>
                      <td className="py-3"><StatusBadge status={r.status} /></td>
                    </tr>
                  ))}
              </tbody>
            </table>
          ) : (
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
                {loading && <tr><td colSpan="5" className="py-10 text-center text-slate-400">Loading...</td></tr>}
                {!loading && rows.length === 0 && (
                  <tr><td colSpan="5" className="py-10 text-center text-slate-400">No transactions yet.</td></tr>
                )}
                {!loading &&
                  rows.map((r) => (
                    <tr key={r.id} className="text-slate-700 dark:text-slate-200">
                      <td className="py-3">{formatDate(r.created_at)}</td>
                      <td className="py-3">{r.description ?? '-'}</td>
                      <td className="py-3 capitalize">{r.type === 'reversal' ? 'admin deduction' : r.type}</td>
                      <td className={`py-3 text-right font-semibold ${r.type === 'credit' ? 'text-brand-600' : r.type === 'debit' || r.type === 'reversal' ? 'text-red-600' : ''}`}>
                        {SIGN[r.type] ?? ''}{formatINR(r.amount)}
                      </td>
                      <td className="py-3 text-right">{formatINR(r.balance_after)}</td>
                    </tr>
                  ))}
              </tbody>
            </table>
          )}
        </div>

        <Pagination meta={meta} onPage={setPage} />
      </Card>

      {showForm && <TopupForm onClose={() => setShowForm(false)} onSaved={handleSaved} />}
    </div>
  )
}
