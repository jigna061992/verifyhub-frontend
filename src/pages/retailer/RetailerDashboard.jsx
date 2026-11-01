import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { Wallet, Lock, ShieldCheck, Clock, UserCheck, ClipboardList, PlusCircle, ArrowRight } from 'lucide-react'
import api from '../../api/axios'
import StatCard from '../../components/ui/StatCard'
import Card from '../../components/ui/Card'
import { formatINR } from '../../utils/format'

const actionClass =
  'group flex items-center justify-between rounded-2xl border border-slate-200 bg-white p-5 shadow-sm transition hover:border-brand-500 dark:border-slate-800 dark:bg-slate-900'

export default function RetailerDashboard() {
  const [data, setData] = useState(null)
  const [error, setError] = useState('')

  useEffect(() => {
    api.get('/retailer/dashboard-stats')
      .then((res) => setData(res.data))
      .catch(() => setError('Unable to load dashboard data. Please refresh the page.'))
  }, [])

  if (error) return <p className="text-red-600">{error}</p>
  if (!data) return <p className="text-slate-500">Loading dashboard...</p>

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-900 dark:text-white">{data.business_name}</h1>
        <p className="text-sm text-slate-500 dark:text-slate-400">Verify customers and manage your wallet.</p>
      </div>

      {/* Wallet hero */}
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-brand-800 to-brand-950 p-6 text-white shadow-lg">
        <div className="absolute -right-10 -top-10 h-40 w-40 rounded-full bg-accent-400/20 blur-2xl" />
        <div className="relative flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
          <div>
            <p className="text-sm text-brand-200">Available wallet balance</p>
            <p className="mt-1 text-4xl font-extrabold">{formatINR(data.wallet.available)}</p>
            <p className="mt-2 text-xs text-brand-200">Reserved for running checks: {formatINR(data.wallet.reserved)}</p>
          </div>
          <Link
            to="/retailer/wallet"
            className="inline-flex items-center justify-center gap-2 rounded-xl bg-accent-400 px-5 py-3 text-sm font-semibold text-brand-950 hover:bg-accent-300"
          >
            <PlusCircle className="h-4 w-4" /> Add money
          </Link>
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard icon={ShieldCheck} label="Total checks" value={data.verifications.total} sub="All time" tone="brand" />
        <StatCard icon={Wallet} label="Total spend" value={formatINR(data.verifications.spend)} sub="On verifications" tone="violet" />
        <StatCard icon={Lock} label="Reserved amount" value={formatINR(data.wallet.reserved)} sub="Held until result" tone="amber" />
        <StatCard icon={Clock} label="Pending top-ups" value={data.topups.pending_count} sub="Waiting for admin approval" tone="slate" />
      </div>

      {/* Quick actions */}
      <div className="grid gap-4 sm:grid-cols-2">
        <Link to="/retailer/verify" className={actionClass}>
          <span className="flex items-center gap-4">
            <span className="flex h-12 w-12 items-center justify-center rounded-xl bg-brand-50 text-brand-700 dark:bg-brand-950 dark:text-brand-300">
              <UserCheck className="h-6 w-6" />
            </span>
            <span>
              <span className="block font-semibold text-slate-900 dark:text-white">Single verification</span>
              <span className="text-sm text-slate-500 dark:text-slate-400">PAN, Bank, Aadhaar one at a time</span>
            </span>
          </span>
          <ArrowRight className="h-5 w-5 text-slate-400 group-hover:text-brand-600" />
        </Link>

        <Link to="/retailer/kyc" className={actionClass}>
          <span className="flex items-center gap-4">
            <span className="flex h-12 w-12 items-center justify-center rounded-xl bg-amber-50 text-amber-600 dark:bg-amber-950 dark:text-amber-300">
              <ClipboardList className="h-6 w-6" />
            </span>
            <span>
              <span className="block font-semibold text-slate-900 dark:text-white">Complete KYC</span>
              <span className="text-sm text-slate-500 dark:text-slate-400">Aadhaar, PAN, Bank and e-Sign consent</span>
            </span>
          </span>
          <ArrowRight className="h-5 w-5 text-slate-400 group-hover:text-brand-600" />
        </Link>
      </div>

      <Card title="Your services & rates">
        {data.services.length === 0 ? (
          <p className="py-6 text-center text-sm text-slate-400">No services are enabled yet.</p>
        ) : (
          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
            {data.services.map((s) => (
              <div
                key={s.code}
                className="flex items-center justify-between rounded-xl border border-slate-200 p-4 dark:border-slate-700"
              >
                <div>
                  <p className="text-sm font-semibold text-slate-900 dark:text-white">{s.name}</p>
                  <p className="text-xs text-slate-500 dark:text-slate-400">{s.code}</p>
                </div>
                <span className="rounded-lg bg-brand-50 px-3 py-1 text-sm font-bold text-brand-800 dark:bg-brand-950 dark:text-brand-200">
                  {formatINR(s.price)}
                </span>
              </div>
            ))}
          </div>
        )}
      </Card>
    </div>
  )
}