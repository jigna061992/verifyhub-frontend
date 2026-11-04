import { useEffect, useMemo, useState } from 'react'
import {
  Printer, Download, CalendarDays, CalendarRange, Store, Layers, IndianRupee, ArrowLeftRight, Table2,
  AlertTriangle, ChevronLeft, ChevronRight,
} from 'lucide-react'
import api from '../../api/axios'
import Card from '../../components/ui/Card'
import { StackedBars, RevenueChart } from '../../components/charts/Charts'
import { formatINR } from '../../utils/format'
import { getErrorMessage } from '../../utils/errors'

/* ---------- Dates ---------- */

// YYYY-MM-DD in the user's own timezone
const toISO = (d) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`

const daysAgo = (n) => {
  const d = new Date()
  d.setDate(d.getDate() - n)
  return toISO(d)
}

const monthsAgo = (n) => {
  const d = new Date()
  d.setMonth(d.getMonth() - n)
  return toISO(d)
}

const PRESETS = [
  { label: '7D', from: () => daysAgo(6) },
  { label: '30D', from: () => daysAgo(29) },
  { label: '90D', from: () => daysAgo(89) },
  { label: '6M', from: () => monthsAgo(6) },
  { label: '1Y', from: () => daysAgo(364) },
]

const longDate = (iso) => new Date(`${iso}T00:00:00`).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })
const shortDate = (iso) => new Date(`${iso}T00:00:00`).toLocaleDateString('en-IN', { day: '2-digit', month: 'short' })
const monthLabel = (ym) => {
  const [y, m] = ym.split('-').map(Number)
  return new Date(y, m - 1, 1).toLocaleDateString('en-IN', { month: 'short', year: 'numeric' })
}
const pct = (v) => (v === null || v === undefined ? '-' : `${v}%`)
const rate = (ok, total) => (total > 0 ? `${(ok / total * 100).toFixed(1)}%` : '0.0%')

/* ---------- Tabs ---------- */

const TABS = [
  { key: 'daily', label: 'Daily verification', icon: CalendarDays },
  { key: 'monthly', label: 'Monthly verification', icon: CalendarRange },
  { key: 'retailer', label: 'Retailer-wise', icon: Store },
  { key: 'service', label: 'Service-wise', icon: Layers },
  { key: 'revenue', label: 'Revenue', icon: IndianRupee },
  { key: 'wallet', label: 'Wallet transactions', icon: ArrowLeftRight },
]

const PAGE_SIZE = 12

// CSV cell that cannot run as a formula in Excel
const csvCell = (v) => {
  let t = String(v ?? '')
  if (/^[=+\-@\t\r]/.test(t)) t = `'${t}`
  return /[",\n]/.test(t) ? `"${t.replace(/"/g, '""')}"` : t
}

const th = 'whitespace-nowrap px-4 py-3 text-[11px] font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400'
const td = 'whitespace-nowrap px-4 py-3.5'

function Stat({ label, value, sub }) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white px-5 py-4 shadow-sm dark:border-slate-800 dark:bg-slate-900">
      <div className="text-[11px] font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">{label}</div>
      <div className="mt-1 text-2xl font-bold text-slate-900 dark:text-white">{value}</div>
      {sub && <div className="mt-0.5 text-xs text-slate-500 dark:text-slate-400">{sub}</div>}
    </div>
  )
}

// Horizontal bars (retailer-wise and service-wise tabs)
function RankBars({ items }) {
  const max = Math.max(1, ...items.map((i) => i.value))

  return (
    <ul className="space-y-3">
      {items.length === 0 && <li className="py-8 text-center text-sm text-slate-400">No activity in this period.</li>}
      {items.map((i) => (
        <li key={i.label}>
          <div className="flex items-baseline justify-between gap-3 text-sm">
            <span className="truncate text-slate-700 dark:text-slate-200">{i.label}</span>
            <span className="font-semibold text-slate-900 dark:text-white">{i.text}</span>
          </div>
          <div className="mt-1.5 h-2 rounded-full bg-slate-100 dark:bg-slate-800">
            <div className="h-2 rounded-full bg-brand-500" style={{ width: `${(i.value / max) * 100}%` }} />
          </div>
        </li>
      ))}
    </ul>
  )
}

// Table with client side paging ("Showing 1-12 of 30")
function DataTable({ columns, rows, empty = 'No data for this period.' }) {
  const [page, setPage] = useState(1)
  const pages = Math.max(1, Math.ceil(rows.length / PAGE_SIZE))
  const current = Math.min(page, pages)
  const slice = rows.slice((current - 1) * PAGE_SIZE, current * PAGE_SIZE)

  // go back to page 1 when the data changes (new tab or new dates)
  useEffect(() => setPage(1), [rows])

  const btn = 'flex h-9 w-9 items-center justify-center rounded-lg border border-slate-200 text-slate-600 hover:bg-slate-100 disabled:opacity-40 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800'

  return (
    <>
      <div className="thin-scroll overflow-x-auto">
        <table className="w-full min-w-[640px] text-sm">
          <thead>
            <tr className="border-y border-slate-100 bg-slate-50/60 dark:border-slate-800 dark:bg-slate-950/40">
              {columns.map((c) => (
                <th key={c.key} className={`${th} ${c.align === 'left' ? 'text-left' : 'text-right'}`}>{c.label}</th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
            {slice.length === 0 && <tr><td colSpan={columns.length} className="py-10 text-center text-slate-400">{empty}</td></tr>}
            {slice.map((r, i) => (
              <tr key={i} className="text-slate-700 dark:text-slate-200">
                {columns.map((c) => (
                  <td key={c.key} className={`${td} ${c.align === 'left' ? 'text-left font-semibold text-slate-900 dark:text-white' : 'text-right'} ${c.tone ? c.tone(r) : ''}`}>
                    {c.render ? c.render(r) : r[c.key]}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {rows.length > 0 && (
        <div className="flex items-center justify-between px-5 py-4 text-sm text-slate-500 dark:text-slate-400">
          <span>Showing <b className="text-slate-900 dark:text-white">{(current - 1) * PAGE_SIZE + 1}–{Math.min(current * PAGE_SIZE, rows.length)}</b> of <b className="text-slate-900 dark:text-white">{rows.length}</b></span>
          {pages > 1 && (
            <div className="flex items-center gap-1.5">
              <button className={btn} disabled={current <= 1} onClick={() => setPage(current - 1)} aria-label="Previous page"><ChevronLeft className="h-4 w-4" /></button>
              {Array.from({ length: pages }, (_, i) => i + 1).slice(Math.max(0, current - 3), current + 2).map((n) => (
                <button key={n} onClick={() => setPage(n)} className={`h-9 w-9 rounded-lg border text-sm font-semibold ${n === current ? 'border-brand-600 bg-brand-600 text-white' : 'border-slate-200 text-slate-600 hover:bg-slate-100 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800'}`}>{n}</button>
              ))}
              <button className={btn} disabled={current >= pages} onClick={() => setPage(current + 1)} aria-label="Next page"><ChevronRight className="h-4 w-4" /></button>
            </div>
          )}
        </div>
      )}
    </>
  )
}

const green = (r) => (r.verified > 0 ? 'text-emerald-600' : '')
const red = (r) => (r.failed > 0 ? 'text-red-600' : '')

export default function Reports() {
  const [tab, setTab] = useState('daily')
  const [from, setFrom] = useState(daysAgo(29))
  const [to, setTo] = useState(toISO(new Date()))
  const [data, setData] = useState(null)
  const [generatedAt, setGeneratedAt] = useState(null)
  const [loading, setLoading] = useState(true)
  const [exporting, setExporting] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    if (!from || !to) return undefined
    let cancelled = false
    setLoading(true)
    setError('')

    api
      .get('/admin/reports', { params: { from, to } })
      .then((res) => {
        if (cancelled) return
        setData(res.data)
        setGeneratedAt(new Date())
      })
      .catch((err) => !cancelled && setError(getErrorMessage(err, 'Unable to load the report.')))
      .finally(() => !cancelled && setLoading(false))

    return () => {
      cancelled = true
    }
  }, [from, to])

  const t = data?.totals
  const totalCount = t ? t.checks + t.kyc : 0
  const successCount = t ? t.checks_success + t.kyc_completed : 0
  const wallet = data?.wallet?.totals

  /* What each tab shows: stat cards, table columns and table rows (newest first for dates) */
  const view = useMemo(() => {
    if (!data) return null

    const dayCols = [
      { key: 'label', label: 'Date', align: 'left' },
      { key: 'total', label: 'Total' },
      { key: 'verified', label: 'Verified', tone: green },
      { key: 'failed', label: 'Failed', tone: red },
      { key: 'pending', label: 'Pending' },
      { key: 'success', label: 'Success %', render: (r) => rate(r.verified, r.total) },
      { key: 'billed', label: 'Billed', render: (r) => formatINR(r.revenue), tone: () => 'font-bold text-slate-900 dark:text-white' },
    ]

    const days = [...data.daily].reverse().map((d) => ({ ...d, label: longDate(d.date) }))
    const months = [...data.monthly].reverse().map((m) => ({ ...m, label: monthLabel(m.month) }))

    switch (tab) {
      case 'monthly':
        return { title: 'Monthly verification report', icon: CalendarRange, columns: dayCols.map((c) => (c.key === 'label' ? { ...c, label: 'Month' } : c)), rows: months, file: 'monthly' }
      case 'retailer':
        return {
          title: 'Retailer-wise report', icon: Store, file: 'retailer-wise', rows: data.by_retailer,
          columns: [
            { key: 'business_name', label: 'Retailer', align: 'left' },
            { key: 'checks', label: 'Checks', render: (r) => `${r.checks_success}/${r.checks}` },
            { key: 'kyc', label: 'KYC', render: (r) => `${r.kyc_completed}/${r.kyc}` },
            { key: 'revenue', label: 'Revenue', render: (r) => formatINR(r.revenue) },
            { key: 'cost', label: 'Provider cost', render: (r) => formatINR(r.cost) },
            { key: 'profit', label: 'Profit', render: (r) => formatINR(r.profit), tone: () => 'font-semibold text-brand-700 dark:text-brand-300' },
            { key: 'margin_percent', label: 'Margin', render: (r) => pct(r.margin_percent) },
          ],
        }
      case 'service':
        return {
          title: 'Service-wise report', icon: Layers, file: 'service-wise', rows: data.by_service,
          columns: [
            { key: 'service', label: 'Service', align: 'left' },
            { key: 'total', label: 'Used' },
            { key: 'success_rate', label: 'Success', render: (r) => pct(r.success_rate) },
            { key: 'revenue', label: 'Revenue', render: (r) => formatINR(r.revenue) },
            { key: 'cost', label: 'Provider cost', render: (r) => formatINR(r.cost) },
            { key: 'profit', label: 'Profit', render: (r) => formatINR(r.profit), tone: () => 'font-semibold text-brand-700 dark:text-brand-300' },
            { key: 'margin_percent', label: 'Margin', render: (r) => pct(r.margin_percent) },
          ],
        }
      case 'revenue':
        return {
          title: 'Revenue report', icon: IndianRupee, file: 'revenue', rows: months,
          columns: [
            { key: 'label', label: 'Month', align: 'left' },
            { key: 'revenue', label: 'Revenue', render: (r) => formatINR(r.revenue) },
            { key: 'cost', label: 'Provider cost', render: (r) => formatINR(r.cost) },
            { key: 'profit', label: 'Profit', render: (r) => formatINR(r.profit), tone: () => 'font-semibold text-brand-700 dark:text-brand-300' },
            { key: 'margin_percent', label: 'Margin', render: (r) => pct(r.margin_percent) },
          ],
        }
      case 'wallet':
        return {
          title: 'Wallet transactions report', icon: ArrowLeftRight, file: 'wallet',
          rows: [...data.wallet.daily].reverse().map((d) => ({ ...d, label: longDate(d.date) })),
          columns: [
            { key: 'label', label: 'Date', align: 'left' },
            { key: 'transactions', label: 'Entries' },
            { key: 'credited', label: 'Money added', render: (r) => formatINR(r.credited), tone: (r) => (r.credited > 0 ? 'text-emerald-600' : '') },
            { key: 'charged', label: 'Charged for checks', render: (r) => formatINR(r.charged) },
            { key: 'deducted', label: 'Admin deductions', render: (r) => formatINR(r.deducted), tone: (r) => (r.deducted > 0 ? 'text-red-600' : '') },
          ],
        }
      default:
        return { title: 'Daily verification report', icon: CalendarDays, columns: dayCols, rows: days, file: 'daily' }
    }
  }, [data, tab])

  /* Four stat cards on top of each tab */
  const stats = (() => {
    if (!t) return []
    if (tab === 'wallet') {
      return [
        ['Money added', formatINR(wallet?.credited)],
        ['Charged for checks', formatINR(wallet?.charged)],
        ['Admin deductions', formatINR(wallet?.deducted)],
        ['Entries', wallet?.transactions ?? 0],
      ]
    }
    if (['retailer', 'service', 'revenue'].includes(tab)) {
      return [['Revenue', formatINR(t.revenue)], ['Provider cost', formatINR(t.cost)], ['Profit', formatINR(t.profit)], ['Margin', pct(t.margin_percent)]]
    }
    return [['Verifications', totalCount], ['Success rate', rate(successCount, totalCount)], ['Failed', t.failed ?? 0], ['Billed', formatINR(t.revenue)]]
  })()

  // CSV of the table that is open on the screen
  const exportCsv = () => {
    if (!view) return
    setExporting(true)
    const textOf = (c, r) => (c.render ? c.render(r) : r[c.key])
    const lines = [view.columns.map((c) => csvCell(c.label)).join(',')]
    view.rows.forEach((r) => lines.push(view.columns.map((c) => csvCell(String(textOf(c, r)).replace(/₹/g, ''))).join(',')))

    const url = URL.createObjectURL(new Blob([`﻿${lines.join('\r\n')}`], { type: 'text/csv;charset=utf-8' }))
    const a = document.createElement('a')
    a.href = url
    a.download = `verifyhub-${view.file}-${from}-to-${to}.csv`
    document.body.appendChild(a)
    a.click()
    a.remove()
    URL.revokeObjectURL(url)
    setExporting(false)
  }

  // One row per check / KYC case, from the server (large ranges are streamed there)
  const downloadTransactions = async () => {
    setError('')
    try {
      const res = await api.get('/admin/reports/transactions', { params: { from, to }, responseType: 'blob' })
      const url = URL.createObjectURL(res.data)
      const a = document.createElement('a')
      a.href = url
      a.download = `verifyhub-transactions-${from}-to-${to}.csv`
      document.body.appendChild(a)
      a.click()
      a.remove()
      URL.revokeObjectURL(url)
    } catch (err) {
      setError(getErrorMessage(err, 'Unable to download the transactions.'))
    }
  }

  const belowCost = data?.alerts?.below_cost ?? []
  const onHold = data?.on_hold
  const ghost = 'inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-800 shadow-sm hover:bg-slate-50 disabled:opacity-50 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100 dark:hover:bg-slate-800'

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-white">Reports &amp; analytics</h1>
          <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">Operational, financial and wallet reports with exportable data.</p>
        </div>
        <div className="flex flex-wrap gap-2 print:hidden">
          <button onClick={() => window.print()} className={ghost}><Printer className="h-4 w-4" /> Print</button>
          <button onClick={downloadTransactions} disabled={loading || !data} className={ghost}><Download className="h-4 w-4" /> Transactions CSV</button>
          <button onClick={exportCsv} disabled={exporting || loading || !view} className="inline-flex items-center gap-2 rounded-xl bg-brand-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-brand-700 disabled:opacity-50">
            <Download className="h-4 w-4" /> Export CSV
          </button>
        </div>
      </div>

      {/* Tabs + date range */}
      <div className="rounded-2xl border border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900">
        <div className="thin-scroll flex gap-1 overflow-x-auto border-b border-slate-100 px-3 dark:border-slate-800 print:hidden">
          {TABS.map(({ key, label, icon: Icon }) => (
            <button
              key={key}
              onClick={() => setTab(key)}
              className={`flex shrink-0 items-center gap-2 border-b-2 px-3 py-4 text-sm font-semibold transition ${
                tab === key ? 'border-brand-600 text-brand-600 dark:border-brand-400 dark:text-brand-400' : 'border-transparent text-slate-600 hover:text-slate-900 dark:text-slate-300 dark:hover:text-white'
              }`}
            >
              <Icon className="h-4 w-4" /> {label}
            </button>
          ))}
        </div>

        <div className="flex flex-wrap items-center gap-3 px-5 py-4">
          <span className="text-sm font-medium text-slate-700 dark:text-slate-200">Date range</span>
          <input type="date" value={from} max={to} onChange={(e) => setFrom(e.target.value)} className="rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm dark:border-slate-700 dark:bg-slate-950 dark:text-white" />
          <span className="text-slate-400">–</span>
          <input type="date" value={to} min={from} max={toISO(new Date())} onChange={(e) => setTo(e.target.value)} className="rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm dark:border-slate-700 dark:bg-slate-950 dark:text-white" />
          <div className="flex gap-2 print:hidden">
            {PRESETS.map((p) => (
              <button
                key={p.label}
                onClick={() => { setFrom(p.from()); setTo(toISO(new Date())) }}
                className="rounded-full border border-slate-300 px-3 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-50 dark:border-slate-700 dark:text-slate-200 dark:hover:bg-slate-800"
              >
                {p.label}
              </button>
            ))}
          </div>
          {generatedAt && (
            <span className="ml-auto text-xs text-slate-500 dark:text-slate-400">
              Generated {generatedAt.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}, {generatedAt.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' }).toLowerCase()}
            </span>
          )}
        </div>
      </div>

      {error && <p className="text-sm text-red-600">{error}</p>}
      {loading && !data && <p className="text-slate-500">Loading report...</p>}

      {view && (
        <>
          <div className={`grid gap-4 sm:grid-cols-2 xl:grid-cols-4 ${loading ? 'opacity-60' : ''}`}>
            {stats.map(([label, value]) => <Stat key={label} label={label} value={value} />)}
          </div>

          {/* Money on hold and prices below cost are shown on the Revenue tab */}
          {tab === 'revenue' && (
            <>
              <div className="grid gap-4 sm:grid-cols-3">
                <Stat label="Failed or cancelled" value={t.failed ?? 0} sub="Not charged. Money went back to the wallet." />
                <Stat label="In progress" value={t.in_progress ?? 0} sub="Open OTP checks, KYC cases and held checks" />
                <Stat label="On hold now" value={formatINR(onHold?.amount)} sub={`${onHold?.count ?? 0} check(s) waiting for reconciliation`} />
              </div>

              {belowCost.length > 0 && (
                <div className="rounded-2xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900 dark:border-amber-900 dark:bg-amber-950 dark:text-amber-200">
                  <div className="flex items-center gap-2 font-semibold"><AlertTriangle className="h-4 w-4" /> Price is lower than the provider cost</div>
                  <ul className="mt-2 list-inside list-disc space-y-1">
                    {belowCost.map((a, i) => (
                      <li key={i}>{a.scope}, {a.service}: price {formatINR(a.price)}, cost {formatINR(a.cost)}. Every successful check loses {formatINR(a.cost - a.price)}.</li>
                    ))}
                  </ul>
                </div>
              )}
            </>
          )}

          {/* Chart of the open tab */}
          <Card icon={view.icon} title={view.title} subtitle={`${longDate(from)} – ${longDate(to)}`}>
            {tab === 'daily' && <StackedBars data={data.daily.map((d) => ({ ...d, label: shortDate(d.date) }))} />}
            {tab === 'monthly' && <StackedBars data={data.monthly.map((m) => ({ ...m, label: monthLabel(m.month) }))} />}
            {tab === 'retailer' && <RankBars items={data.by_retailer.slice(0, 8).map((r) => ({ label: r.business_name, value: r.revenue, text: formatINR(r.revenue) }))} />}
            {tab === 'service' && <RankBars items={data.by_service.map((s) => ({ label: s.service, value: s.revenue, text: `${formatINR(s.revenue)} · ${s.total} used` }))} />}
            {tab === 'revenue' && (
              data.monthly.length > 0
                ? <RevenueChart data={data.monthly.map((m) => ({ label: monthLabel(m.month), revenue: m.revenue, cost: m.cost, margin: m.profit }))} />
                : <p className="py-8 text-center text-sm text-slate-400">No activity in this period.</p>
            )}
            {tab === 'wallet' && (
              <RankBars items={[
                { label: 'Money added', value: wallet?.credited ?? 0, text: formatINR(wallet?.credited) },
                { label: 'Charged for checks', value: wallet?.charged ?? 0, text: formatINR(wallet?.charged) },
                { label: 'Admin deductions', value: wallet?.deducted ?? 0, text: formatINR(wallet?.deducted) },
              ]} />
            )}
          </Card>

          <Card flush icon={Table2} title="Report data">
            <DataTable columns={view.columns} rows={view.rows} />
          </Card>
        </>
      )}
    </div>
  )
}
