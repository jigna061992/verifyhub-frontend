import { TrendingDown, TrendingUp } from 'lucide-react'

const TONES = {
  brand: 'bg-brand-50 text-brand-600 dark:bg-brand-500/15 dark:text-brand-300',
  green: 'bg-emerald-50 text-emerald-600 dark:bg-emerald-500/15 dark:text-emerald-300',
  violet: 'bg-violet-50 text-violet-600 dark:bg-violet-500/15 dark:text-violet-300',
  amber: 'bg-amber-50 text-amber-600 dark:bg-amber-500/15 dark:text-amber-300',
  red: 'bg-red-50 text-red-600 dark:bg-red-500/15 dark:text-red-300',
  sky: 'bg-sky-50 text-sky-600 dark:bg-sky-500/15 dark:text-sky-300',
  slate: 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300',
}

// change = percent number. goodWhen tells which direction is good ('up' for revenue, 'down' for failures).
export default function StatCard({ icon: Icon, label, value, sub, tone = 'brand', change, goodWhen = 'up' }) {
  const hasChange = change !== null && change !== undefined
  const up = hasChange && change >= 0
  const good = hasChange && (goodWhen === 'up' ? up : !up)

  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900">
      <div className="flex items-start justify-between gap-3">
        <p className="text-sm font-medium text-slate-600 dark:text-slate-300">{label}</p>
        <span className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ${TONES[tone]}`}>
          <Icon className="h-5 w-5" />
        </span>
      </div>

      <p className="-mt-1 text-[28px] font-bold leading-tight text-slate-900 dark:text-white">{value}</p>

      <div className="mt-2 flex flex-wrap items-center gap-2 text-xs text-slate-500 dark:text-slate-400">
        {hasChange && (
          <span
            className={`inline-flex items-center gap-1 rounded-md px-1.5 py-0.5 font-semibold ${
              good
                ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-300'
                : 'bg-red-50 text-red-600 dark:bg-red-500/15 dark:text-red-300'
            }`}
          >
            {up ? <TrendingUp className="h-3 w-3" /> : <TrendingDown className="h-3 w-3" />}
            {Math.abs(change)}%
          </span>
        )}
        {sub && <span>{sub}</span>}
      </div>
    </div>
  )
}
