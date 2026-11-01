import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { Store, Wallet, Clock, ShieldCheck, IndianRupee } from 'lucide-react'
import api from '../../api/axios'
import StatCard from '../../components/ui/StatCard'
import Card from '../../components/ui/Card'
import StatusBadge from '../../components/ui/StatusBadge'
import MiniBarChart from '../../components/ui/MiniBarChart'
import { formatINR, formatDate } from '../../utils/format'

const linkClass = 'text-sm font-semibold text-brand-700 hover:underline dark:text-brand-300'

export default function AdminDashboard() {
  const [stats, setStats] = useState(null)
  const [error, setError] = useState('')

  useEffect(() => {
    api.get('/admin/dashboard-stats')
      .then((res) => setStats(res.data))
      .catch(() => setError('Unable to load dashboard data. Please refresh the page.'))
  }, [])

  if (error) return <p className="text-red-600">{error}</p>
  if (!stats) return <p className="text-slate-500">Loading dashboard...</p>

  const { retailers, wallet, verifications } = stats

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-900 dark:text-white">Dashboard</h1>
        <p className="text-sm text-slate-500 dark:text-slate-400">Overview of the whole retailer network.</p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard
          icon={Store}
          label="Total retailers"
          value={retailers.total}
          sub={`${retailers.active} active · ${retailers.inactive} inactive`}
          tone="brand"
        />
        <StatCard
          icon={Wallet}
          label="Total wallet balance"
          value={formatINR(wallet.total_balance)}
          sub="Across all retailers"
          tone="violet"
        />
        <StatCard
          icon={Clock}
          label="Pending top-ups"
          value={wallet.pending_topups_count}
          sub={`${formatINR(wallet.pending_topups_amount)} waiting for approval`}
          tone="amber"
        />
        <StatCard
          icon={ShieldCheck}
          label="Verifications"
          value={verifications.total}
          sub={verifications.success_rate === null ? 'Success rate: no data yet' : `Success rate: ${verifications.success_rate}%`}
          tone="slate"
        />
      </div>

      <div className="grid gap-6 xl:grid-cols-3">
        <Card title="Verifications · last 7 days" className="xl:col-span-2">
          <MiniBarChart data={stats.chart} />
        </Card>

        <Card
          title="Pending top-up requests"
          action={<Link to="/admin/wallet" className={linkClass}>View all</Link>}
        >
          {stats.pending_topups.length === 0 ? (
            <p className="py-6 text-center text-sm text-slate-400">No pending requests.</p>
          ) : (
            <ul className="divide-y divide-slate-100 dark:divide-slate-800">
              {stats.pending_topups.map((t) => (
                <li key={t.id} className="flex items-center justify-between py-3">
                  <div>
                    <p className="text-sm font-semibold text-slate-900 dark:text-white">{t.business_name}</p>
                    <p className="text-xs text-slate-500 dark:text-slate-400">{t.method} · {formatDate(t.created_at)}</p>
                  </div>
                  <span className="flex items-center text-sm font-bold text-slate-900 dark:text-white">
                    <IndianRupee className="h-3.5 w-3.5" />
                    {Number(t.amount).toLocaleString('en-IN')}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </Card>
      </div>

      <Card
        title="Recent retailers"
        action={<Link to="/admin/retailers" className={linkClass}>Manage</Link>}
      >
        <div className="overflow-x-auto">
          <table className="w-full min-w-[600px] text-left text-sm">
            <thead>
              <tr className="border-b border-slate-100 text-xs uppercase tracking-wide text-slate-400 dark:border-slate-800">
                <th className="pb-3 font-semibold">Business</th>
                <th className="pb-3 font-semibold">Owner</th>
                <th className="pb-3 font-semibold">Mobile</th>
                <th className="pb-3 font-semibold">Wallet</th>
                <th className="pb-3 font-semibold">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
              {stats.recent_retailers.length === 0 && (
                <tr><td colSpan="5" className="py-8 text-center text-slate-400">No retailers yet.</td></tr>
              )}
              {stats.recent_retailers.map((r) => (
                <tr key={r.id} className="text-slate-700 dark:text-slate-200">
                  <td className="py-3 font-semibold">{r.business_name}</td>
                  <td className="py-3">{r.owner}</td>
                  <td className="py-3">{r.mobile}</td>
                  <td className="py-3">{formatINR(r.balance)}</td>
                  <td className="py-3"><StatusBadge status={r.status} /></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  )
}