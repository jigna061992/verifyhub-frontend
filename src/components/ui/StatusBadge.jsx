const GREEN = 'bg-emerald-50 text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-300'
const RED = 'bg-red-50 text-red-700 dark:bg-red-500/15 dark:text-red-300'
const AMBER = 'bg-amber-50 text-amber-700 dark:bg-amber-500/15 dark:text-amber-300'
const GREY = 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300'

const STYLES = {
  active: GREEN,
  approved: GREEN,
  success: GREEN,
  completed: GREEN,
  verified: GREEN,
  inactive: GREY,
  cancelled: GREY,
  expired: GREY,
  pending: AMBER,
  in_progress: AMBER,
  rejected: RED,
  failed: RED,
}

const DOT = { [GREEN]: 'bg-emerald-500', [RED]: 'bg-red-500', [AMBER]: 'bg-amber-500', [GREY]: 'bg-slate-400' }

export default function StatusBadge({ status }) {
  const style = STYLES[status] || GREY
  const label = status === 'success' ? 'verified' : String(status).replace(/_/g, ' ')

  return (
    <span className={`inline-flex items-center gap-1.5 whitespace-nowrap rounded-full px-2.5 py-1 text-xs font-semibold capitalize ${style}`}>
      <span className={`h-1.5 w-1.5 rounded-full ${DOT[style]}`} />
      {label}
    </span>
  )
}
