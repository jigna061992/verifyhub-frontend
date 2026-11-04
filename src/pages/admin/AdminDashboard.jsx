import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import {
  Store, UserCheck, ShieldCheck, CheckCircle2, XCircle, Activity, IndianRupee, ArrowLeftRight,
  LineChart, PieChart, BarChart3, Gauge, History, Trophy, Bell, FileText, Wallet, UserPlus,
  Scale, AlertTriangle, ChevronRight,
} from 'lucide-react'
import api from '../../api/axios'
import { useAuth } from '../../context/AuthContext'
import StatCard from '../../components/ui/StatCard'
import Card from '../../components/ui/Card'
import StatusBadge from '../../components/ui/StatusBadge'
import { TrendChart, DonutChart, RevenueChart, GaugeChart } from '../../components/charts/Charts'
import { metaFor } from '../../utils/serviceMeta'
import { formatINR } from '../../utils/format'
import { timeAgo } from '../retailer/services/helpers'

// One colour per service, used by the donut and the success-rate bars
const SERVICE_COLOR = {
  AADHAAR: '#6d4fe0',
  PAN: '#2b55e5',
  BANK: '#0b86c9',
  ESIGN: '#0f9d8a',
  COMPLETE_KYC: '#8b5cf6',
}

const ALERT_STYLE = {
  topup: { icon: Wallet, tone: 'bg-brand-50 text-brand-600 dark:bg-brand-500/15 dark:text-brand-300' },
  reconciliation: { icon: Scale, tone: 'bg-amber-50 text-amber-600 dark:bg-amber-500/15 dark:text-amber-300' },
  low_balance: { icon: AlertTriangle, tone: 'bg-amber-50 text-amber-600 dark:bg-amber-500/15 dark:text-amber-300' },
  failures: { icon: XCircle, tone: 'bg-red-50 text-red-600 dark:bg-red-500/15 dark:text-red-300' },
}

const linkClass = 'text-sm font-semibold text-brand-700 hover:underline dark:text-brand-300'
const ghostBtn =
  'inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-800 shadow-sm hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100 dark:hover:bg-slate-800'

const greeting = () => {
  const h = new Date().getHours()
  return h < 12 ? 'Good morning' : h < 17 ? 'Good afternoon' : 'Good evening'
}

export default function AdminDashboard() {
  const { user } = useAuth()
  const [stats, setStats] = useState(null)
  const [error, setError] = useState('')

  useEffect(() => {
    api.get('/admin/dashboard-stats')
      .then((res) => setStats(res.data))
      .catch(() => setError('Unable to load dashboard data. Please refresh the page.'))
  }, [])

  if (error) return <p className="text-red-600">{error}</p>
  if (!stats) return <p className="text-slate-500">Loading dashboard...</p>

  const { retailers, wallet, verifications: v, today, margin } = stats
  const today_ = new Date().toLocaleDateString('en-IN', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })
  const firstName = (user.name || '').split(' ')[0]

  return (
    <div className="space-y-6">
      {/* Greeting + quick actions */}
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-white">{greeting()}, {firstName}</h1>
          <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
            Platform performance across {retailers.total} retailers · {today_}
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Link to="/admin/reports" className={ghostBtn}><FileText className="h-4 w-4" /> View reports</Link>
          <Link to="/admin/wallets" className={ghostBtn}><Wallet className="h-4 w-4" /> Add balance</Link>
          <Link
            to="/admin/retailers"
            className="inline-flex items-center gap-2 rounded-xl bg-brand-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-brand-700"
          >
            <UserPlus className="h-4 w-4" /> Add retailer
          </Link>
        </div>
      </div>

      {/* KPI cards */}
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard icon={Store} tone="brand" label="Total Retailers" value={retailers.total} sub={`+${retailers.new_30d} onboarded in 30 days`} />
        <StatCard icon={UserCheck} tone="green" label="Active Retailers" value={retailers.active} sub={`${retailers.active_pct}% of network active`} />
        <StatCard icon={ShieldCheck} tone="violet" label="Total KYC Verifications" value={v.total} change={v.total_change} sub="last 30 days vs prior" />
        <StatCard icon={CheckCircle2} tone="green" label="Successful Verifications" value={v.success} change={v.success_change} sub={v.success_rate === null ? 'no data yet' : `${v.success_rate}% success rate`} />
        <StatCard icon={XCircle} tone="red" label="Failed Verifications" value={v.failed} change={v.failed_change} goodWhen="down" sub={v.failed_share === null ? 'no data yet' : `${v.failed_share}% of all requests`} />
        <StatCard icon={Activity} tone="sky" label="Today's Transactions" value={today.transactions} change={today.pace_change} sub={`${formatINR(today.billed)} billed · pace vs 7-day avg`} />
        <StatCard icon={IndianRupee} tone="brand" label="Total Revenue" value={formatINR(v.revenue)} change={v.revenue_change} sub="gross billed to retailers" />
        <StatCard icon={ArrowLeftRight} tone="amber" label="Wallet Transactions" value={wallet.transactions} change={wallet.transactions_change} sub={`${formatINR(wallet.total_credited)} credited in total`} />
      </div>

      {/* Trend + category split */}
      <div className="grid gap-6 xl:grid-cols-3">
        <Card
          className="xl:col-span-2"
          icon={LineChart}
          title="Monthly verification trends"
          subtitle="Verified vs failed requests · last 6 months"
          action={<Link to="/admin/reports" className={linkClass}>Monthly report →</Link>}
        >
          <TrendChart data={stats.trend} />
        </Card>

        <Card icon={PieChart} title="Category distribution" subtitle="Share of all verifications by service">
          <DonutChart items={stats.categories} colors={SERVICE_COLOR} />
          <ul className="mt-3 space-y-2.5">
            {stats.categories.length === 0 && <li className="text-center text-sm text-slate-400">No verifications yet.</li>}
            {stats.categories.map((c) => (
              <li key={c.code} className="flex items-center justify-between gap-3 text-sm">
                <span className="flex items-center gap-2 text-slate-700 dark:text-slate-200">
                  <span className="h-2.5 w-2.5 shrink-0 rounded-sm" style={{ background: SERVICE_COLOR[c.code] || '#64748b' }} />
                  {c.name}
                </span>
                <span className="font-semibold text-slate-900 dark:text-white">{c.total} · {c.percent}%</span>
              </li>
            ))}
          </ul>
        </Card>
      </div>

      {/* Revenue + success rate */}
      <div className="grid gap-6 xl:grid-cols-3">
        <Card
          className="xl:col-span-2"
          icon={BarChart3}
          title="Revenue analytics"
          subtitle="Retailer billing vs provider cost"
          action={
            <div className="flex gap-6 text-right">
              <div>
                <div className="text-[11px] text-slate-500 dark:text-slate-400">Gross margin (30d)</div>
                <div className="text-lg font-bold text-slate-900 dark:text-white">{formatINR(margin.amount)}</div>
              </div>
              <div>
                <div className="text-[11px] text-slate-500 dark:text-slate-400">Margin %</div>
                <div className="text-lg font-bold text-slate-900 dark:text-white">{margin.percent === null ? '-' : `${margin.percent}%`}</div>
              </div>
            </div>
          }
        >
          <RevenueChart data={stats.revenue_chart} />
        </Card>

        <Card icon={Gauge} title="Verification success rate" subtitle="All-time, by outcome and service">
          <GaugeChart value={v.success_rate} />
          <ul className="mt-4 space-y-3">
            {stats.success_by_service.map((s) => (
              <li key={s.code}>
                <div className="flex items-center justify-between text-sm">
                  <span className="text-slate-700 dark:text-slate-200">{s.name}</span>
                  <span className="font-semibold text-slate-900 dark:text-white">{s.rate === null ? '-' : `${s.rate}%`}</span>
                </div>
                <div className="mt-1.5 h-1.5 rounded-full bg-slate-100 dark:bg-slate-800">
                  <div className="h-1.5 rounded-full" style={{ width: `${s.rate ?? 0}%`, background: SERVICE_COLOR[s.code] || '#64748b' }} />
                </div>
              </li>
            ))}
          </ul>
        </Card>
      </div>

      {/* Recent activity + top retailers + alerts */}
      <div className="grid gap-6 xl:grid-cols-3">
        <Card
          className="xl:col-span-2"
          flush
          icon={History}
          title="Recent verification activity"
          subtitle="Latest requests across all retailers"
          action={<Link to="/admin/verifications" className={ghostBtn}>View all records</Link>}
        >
          <div className="thin-scroll overflow-x-auto">
            <table className="w-full min-w-[720px] text-left text-sm">
              <thead>
                <tr className="border-y border-slate-100 text-[11px] uppercase tracking-wider text-slate-500 dark:border-slate-800 dark:text-slate-400">
                  <th className="px-5 py-3 font-semibold">Verification</th>
                  <th className="px-3 py-3 font-semibold">Retailer</th>
                  <th className="px-3 py-3 font-semibold">Service</th>
                  <th className="px-3 py-3 font-semibold">Document</th>
                  <th className="px-3 py-3 font-semibold">Status</th>
                  <th className="px-5 py-3 text-right font-semibold">Amount</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {stats.recent_verifications.length === 0 && (
                  <tr><td colSpan="6" className="py-10 text-center text-slate-400">No verifications yet.</td></tr>
                )}
                {stats.recent_verifications.map((r) => {
                  const meta = metaFor(r.service_code)
                  const Icon = meta.icon
                  return (
                    <tr key={r.id} className="text-slate-700 dark:text-slate-200">
                      <td className="px-5 py-3.5">
                        <div className="font-mono text-xs font-medium text-slate-900 dark:text-white">{r.reference}</div>
                        <div className="text-xs text-slate-400">{timeAgo(r.created_at)}</div>
                      </td>
                      <td className="px-3 py-3.5 font-semibold text-slate-900 dark:text-white">{r.business_name}</td>
                      <td className="px-3 py-3.5">
                        <span className="flex items-center gap-2">
                          <span className={`flex h-7 w-7 items-center justify-center rounded-lg ${meta.tone}`}><Icon className="h-3.5 w-3.5" /></span>
                          {meta.short}
                        </span>
                      </td>
                      <td className="px-3 py-3.5 font-mono text-xs">{r.document}</td>
                      <td className="px-3 py-3.5"><StatusBadge status={r.status} /></td>
                      <td className="px-5 py-3.5 text-right font-semibold text-slate-900 dark:text-white">{formatINR(r.amount)}</td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </Card>

        <div className="space-y-6">
          <Card flush icon={Trophy} title="Top performing retailers" subtitle="By billed volume · last 30 days">
            <ul className="divide-y divide-slate-100 border-t border-slate-100 dark:divide-slate-800 dark:border-slate-800">
              {stats.top_retailers.length === 0 && <li className="py-8 text-center text-sm text-slate-400">No billing yet.</li>}
              {stats.top_retailers.map((r, i) => {
                const top = stats.top_retailers[0].billed || 1
                return (
                  <li key={r.id} className="flex items-center gap-3 px-5 py-3">
                    <span className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-sm font-bold ${
                      i === 0 ? 'bg-amber-100 text-amber-700 dark:bg-amber-500/20 dark:text-amber-300'
                        : i === 1 ? 'bg-slate-200 text-slate-600 dark:bg-slate-700 dark:text-slate-200'
                        : i === 2 ? 'bg-orange-100 text-orange-700 dark:bg-orange-500/20 dark:text-orange-300'
                        : 'bg-slate-100 text-slate-500 dark:bg-slate-800 dark:text-slate-300'
                    }`}>{i + 1}</span>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-baseline justify-between gap-2">
                        <span className="truncate text-sm font-semibold text-slate-900 dark:text-white">{r.business_name}</span>
                        <span className="text-sm font-bold text-slate-900 dark:text-white">{formatINR(r.billed)}</span>
                      </div>
                      <div className="mt-1 flex items-center gap-2">
                        <div className="h-1.5 flex-1 rounded-full bg-slate-100 dark:bg-slate-800">
                          <div className="h-1.5 rounded-full bg-brand-500" style={{ width: `${(r.billed / top) * 100}%` }} />
                        </div>
                        <span className="text-[11px] text-slate-400">{r.checks} checks</span>
                      </div>
                    </div>
                  </li>
                )
              })}
            </ul>
          </Card>

          <Card flush icon={Bell} title="Alerts & notifications" subtitle="Items that need your attention">
            <ul className="divide-y divide-slate-100 border-t border-slate-100 dark:divide-slate-800 dark:border-slate-800">
              {stats.alerts.length === 0 && <li className="py-8 text-center text-sm text-slate-400">Nothing needs your attention.</li>}
              {stats.alerts.map((a, i) => {
                const style = ALERT_STYLE[a.type] || ALERT_STYLE.topup
                const Icon = style.icon
                return (
                  <li key={i}>
                    <Link to={a.link} className="flex items-center gap-3 px-5 py-3.5 hover:bg-slate-50 dark:hover:bg-slate-800/60">
                      <span className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ${style.tone}`}><Icon className="h-[18px] w-[18px]" /></span>
                      <span className="min-w-0 flex-1">
                        <span className="block truncate text-sm font-semibold text-slate-900 dark:text-white">{a.title}</span>
                        <span className="block truncate text-xs text-slate-500 dark:text-slate-400">
                          {a.message}{a.created_at ? ` · ${timeAgo(a.created_at)}` : ''}
                        </span>
                      </span>
                      <ChevronRight className="h-4 w-4 shrink-0 text-slate-400" />
                    </Link>
                  </li>
                )
              })}
            </ul>
          </Card>
        </div>
      </div>
    </div>
  )
}
