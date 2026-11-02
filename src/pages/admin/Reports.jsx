import { useEffect, useState } from 'react'
import { Download, TrendingUp, IndianRupee, Wallet, CheckCircle2, AlertTriangle, PauseCircle, XCircle } from 'lucide-react'
import api from '../../api/axios'
import Card from '../../components/ui/Card'
import { inputClass } from '../../components/ui/Input'
import { formatINR } from '../../utils/format'
import { getErrorMessage } from '../../utils/errors'

// YYYY-MM-DD in the user's own timezone
const toISO = (d) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`

const daysAgo = (n) => {
  const d = new Date()
  d.setDate(d.getDate() - n)
  return toISO(d)
}

const PRESETS = [
  { label: '7 days', from: () => daysAgo(6) },
  { label: '30 days', from: () => daysAgo(29) },
  { label: '90 days', from: () => daysAgo(89) },
  { label: 'This month', from: () => toISO(new Date(new Date().getFullYear(), new Date().getMonth(), 1)) },
]

const pct = (v) => (v === null || v === undefined ? '-' : `${v}%`)

const monthName = (ym) => {
  const [y, m] = ym.split('-').map(Number)
  return new Date(y, m - 1, 1).toLocaleDateString('en-IN', { month: 'short', year: 'numeric' })
}

export default function Reports() {
  const [from, setFrom] = useState(daysAgo(29))
  const [to, setTo] = useState(toISO(new Date()))
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(true)
  const [exporting, setExporting] = useState('') // '' | 'summary' | 'transactions'
  const [error, setError] = useState('')

  useEffect(() => {
    if (!from || !to) return
    let cancelled = false
    setLoading(true)
    setError('')

    api
      .get('/admin/reports', { params: { from, to } })
      .then((res) => !cancelled && setData(res.data))
      .catch((err) => !cancelled && setError(getErrorMessage(err, 'Unable to load the report.')))
      .finally(() => !cancelled && setLoading(false))

    return () => {
      cancelled = true
    }
  }, [from, to])

  // kind: 'summary' (one row per retailer) or 'transactions' (one row per check, with margin)
  const download = async (kind) => {
    setExporting(kind)
    setError('')
    try {
      const path = kind === 'transactions' ? '/admin/reports/transactions' : '/admin/reports/export'
      const res = await api.get(path, { params: { from, to }, responseType: 'blob' })
      const url = URL.createObjectURL(res.data)
      const a = document.createElement('a')
      a.href = url
      a.download = `verifyhub-${kind === 'transactions' ? 'transactions' : 'report'}-${from}-to-${to}.csv`
      document.body.appendChild(a)
      a.click()
      a.remove()
      URL.revokeObjectURL(url)
    } catch (err) {
      setError(getErrorMessage(err, 'Unable to download the report.'))
    } finally {
      setExporting('')
    }
  }

  const t = data?.totals
  const totalCount = t ? t.checks + t.kyc : 0
  const successCount = t ? t.checks_success + t.kyc_completed : 0
  const maxRevenue = data ? Math.max(1, ...data.daily.map((d) => d.revenue)) : 1
  const belowCost = data?.alerts?.below_cost ?? []
  const onHold = data?.on_hold

  const csvBtn = 'flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-semibold disabled:opacity-50'

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-white">Reports</h1>
          <p className="text-sm text-slate-500 dark:text-slate-400">
            Revenue counts only successful checks and completed KYC. Margin is the price charged minus the provider cost.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {PRESETS.map((p) => (
            <button
              key={p.label}
              onClick={() => {
                setFrom(p.from())
                setTo(toISO(new Date()))
              }}
              className="rounded-lg border border-slate-200 px-3 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800"
            >
              {p.label}
            </button>
          ))}
          <input type="date" value={from} max={to} onChange={(e) => setFrom(e.target.value)} className={`${inputClass} w-40`} />
          <input type="date" value={to} min={from} max={toISO(new Date())} onChange={(e) => setTo(e.target.value)} className={`${inputClass} w-40`} />
          <button
            onClick={() => download('summary')}
            disabled={!!exporting || loading || !data}
            className={`${csvBtn} border border-slate-200 text-slate-700 hover:bg-slate-100 dark:border-slate-700 dark:text-slate-200 dark:hover:bg-slate-800`}
          >
            <Download className="h-4 w-4" /> {exporting === 'summary' ? 'Preparing...' : 'Summary CSV'}
          </button>
          <button
            onClick={() => download('transactions')}
            disabled={!!exporting || loading || !data}
            className={`${csvBtn} bg-brand-700 text-white hover:bg-brand-800`}
          >
            <Download className="h-4 w-4" /> {exporting === 'transactions' ? 'Preparing...' : 'Transactions CSV'}
          </button>
        </div>
      </div>

      {error && <p className="text-sm text-red-600">{error}</p>}

      {belowCost.length > 0 && (
        <div className="rounded-2xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900 dark:border-amber-900 dark:bg-amber-950 dark:text-amber-200">
          <div className="flex items-center gap-2 font-semibold">
            <AlertTriangle className="h-4 w-4" /> Price is lower than the provider cost
          </div>
          <ul className="mt-2 list-inside list-disc space-y-1">
            {belowCost.map((a, i) => (
              <li key={i}>
                {a.scope}, {a.service}: price {formatINR(a.price)}, cost {formatINR(a.cost)}. Every successful check loses {formatINR(a.cost - a.price)}.
              </li>
            ))}
          </ul>
        </div>
      )}

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <Stat icon={IndianRupee} label="Revenue" value={t ? formatINR(t.revenue) : '-'} />
        <Stat icon={Wallet} label="Provider cost" value={t ? formatINR(t.cost) : '-'} />
        <Stat icon={TrendingUp} label="Profit (margin)" value={t ? formatINR(t.profit) : '-'} sub={t ? `Margin ${pct(t.margin_percent)}` : ''} />
        <Stat
          icon={CheckCircle2}
          label="Successful"
          value={t ? `${successCount} / ${totalCount}` : '-'}
          sub={t ? `${t.checks} checks, ${t.kyc} KYC cases` : ''}
        />
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        <Stat icon={XCircle} label="Failed or cancelled" value={t ? (t.failed ?? 0) : '-'} sub="Not charged. Money went back to the wallet." />
        <Stat icon={PauseCircle} label="In progress" value={t ? (t.in_progress ?? 0) : '-'} sub="Open OTP checks, KYC cases and held checks" />
        <Stat
          icon={AlertTriangle}
          label="On hold now"
          value={onHold ? formatINR(onHold.amount) : '-'}
          sub={onHold ? `${onHold.count} check${onHold.count === 1 ? '' : 's'} waiting for reconciliation` : ''}
        />
      </div>

      <Card>
        <h2 className="mb-4 font-semibold text-slate-900 dark:text-white">Daily revenue</h2>
        {loading && <p className="py-10 text-center text-slate-400">Loading...</p>}
        {!loading && data && (
          <>
            <div className="flex h-40 items-end gap-px">
              {data.daily.map((d) => (
                <div
                  key={d.date}
                  title={`${d.date}: ${formatINR(d.revenue)} revenue, ${formatINR(d.profit)} profit`}
                  className="flex-1 rounded-t bg-brand-500/80 hover:bg-brand-600"
                  style={{ height: `${Math.max((d.revenue / maxRevenue) * 100, d.revenue > 0 ? 3 : 0.5)}%` }}
                />
              ))}
            </div>
            <div className="mt-2 flex justify-between text-[11px] text-slate-400">
              <span>{data.from}</span>
              <span>{data.to}</span>
            </div>
          </>
        )}
      </Card>

      {data?.monthly?.length > 0 && (
        <Card>
          <h2 className="mb-4 font-semibold text-slate-900 dark:text-white">By month</h2>
          <div className="overflow-x-auto">
            <table className="w-full min-w-[440px] text-left text-sm">
              <thead>
                <tr className="border-b border-slate-100 text-xs uppercase tracking-wide text-slate-400 dark:border-slate-800">
                  <th className="pb-3 font-semibold">Month</th>
                  <th className="pb-3 font-semibold">Revenue</th>
                  <th className="pb-3 font-semibold">Provider cost</th>
                  <th className="pb-3 font-semibold">Profit</th>
                  <th className="pb-3 font-semibold">Margin</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {data.monthly.map((m) => (
                  <tr key={m.month} className="text-slate-700 dark:text-slate-200">
                    <td className="py-3 font-semibold">{monthName(m.month)}</td>
                    <td className="py-3">{formatINR(m.revenue)}</td>
                    <td className="py-3">{formatINR(m.cost)}</td>
                    <td className="py-3 text-brand-700 dark:text-brand-300">{formatINR(m.profit)}</td>
                    <td className="py-3">{pct(m.margin_percent)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      )}

      <div className="grid gap-6 xl:grid-cols-2">
        <Card>
          <h2 className="mb-4 font-semibold text-slate-900 dark:text-white">By service</h2>
          <div className="overflow-x-auto">
            <table className="w-full min-w-[500px] text-left text-sm">
              <thead>
                <tr className="border-b border-slate-100 text-xs uppercase tracking-wide text-slate-400 dark:border-slate-800">
                  <th className="pb-3 font-semibold">Service</th>
                  <th className="pb-3 font-semibold">Used</th>
                  <th className="pb-3 font-semibold">Success</th>
                  <th className="pb-3 font-semibold">Revenue</th>
                  <th className="pb-3 font-semibold">Profit</th>
                  <th className="pb-3 font-semibold">Margin</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {data?.by_service.length === 0 && (
                  <tr><td colSpan="6" className="py-8 text-center text-slate-400">No activity in this period.</td></tr>
                )}
                {data?.by_service.map((s) => (
                  <tr key={s.service} className="text-slate-700 dark:text-slate-200">
                    <td className="py-3 font-semibold">{s.service}</td>
                    <td className="py-3">{s.total}</td>
                    <td className="py-3">{s.success_rate === null ? '-' : `${s.success_rate}%`}</td>
                    <td className="py-3">{formatINR(s.revenue)}</td>
                    <td className="py-3 text-brand-700 dark:text-brand-300">{formatINR(s.profit)}</td>
                    <td className="py-3">{pct(s.margin_percent)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>

        <Card>
          <h2 className="mb-4 font-semibold text-slate-900 dark:text-white">By retailer</h2>
          <div className="overflow-x-auto">
            <table className="w-full min-w-[500px] text-left text-sm">
              <thead>
                <tr className="border-b border-slate-100 text-xs uppercase tracking-wide text-slate-400 dark:border-slate-800">
                  <th className="pb-3 font-semibold">Retailer</th>
                  <th className="pb-3 font-semibold">Checks</th>
                  <th className="pb-3 font-semibold">KYC</th>
                  <th className="pb-3 font-semibold">Revenue</th>
                  <th className="pb-3 font-semibold">Profit</th>
                  <th className="pb-3 font-semibold">Margin</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {data?.by_retailer.length === 0 && (
                  <tr><td colSpan="6" className="py-8 text-center text-slate-400">No activity in this period.</td></tr>
                )}
                {data?.by_retailer.map((r) => (
                  <tr key={r.retailer_id} className="text-slate-700 dark:text-slate-200">
                    <td className="py-3 font-semibold">{r.business_name}</td>
                    <td className="py-3">{r.checks_success}/{r.checks}</td>
                    <td className="py-3">{r.kyc_completed}/{r.kyc}</td>
                    <td className="py-3">{formatINR(r.revenue)}</td>
                    <td className="py-3 text-brand-700 dark:text-brand-300">{formatINR(r.profit)}</td>
                    <td className="py-3">{pct(r.margin_percent)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      </div>
    </div>
  )
}

function Stat({ icon: Icon, label, value, sub }) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-5 dark:border-slate-800 dark:bg-slate-900">
      <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-slate-400">
        <Icon className="h-4 w-4" /> {label}
      </div>
      <div className="mt-2 text-2xl font-bold text-slate-900 dark:text-white">{value}</div>
      {sub && <div className="mt-1 text-xs text-slate-400">{sub}</div>}
    </div>
  )
}
