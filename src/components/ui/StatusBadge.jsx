const GREEN = 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300'
const RED = 'bg-red-50 text-red-700 dark:bg-red-950 dark:text-red-300'
const AMBER = 'bg-amber-50 text-amber-700 dark:bg-amber-950 dark:text-amber-300'
const GREY = 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300'

const STYLES = {
  active: GREEN,
  approved: GREEN,
  success: GREEN,
  completed: GREEN,
  inactive: GREY,
  cancelled: GREY,
  expired: GREY,
  pending: AMBER,
  in_progress: AMBER,
  rejected: RED,
  failed: RED,
}

export default function StatusBadge({ status }) {
  return (
    <span className={`whitespace-nowrap rounded-full px-2.5 py-1 text-xs font-semibold capitalize ${STYLES[status] || GREY}`}>
      {String(status).replace(/_/g, ' ')}
    </span>
  )
}
