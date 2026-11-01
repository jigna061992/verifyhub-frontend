import { ChevronLeft, ChevronRight } from 'lucide-react'

export default function Pagination({ meta, onPage }) {
  if (!meta || meta.total === 0) return null

  const btn =
    'flex h-9 w-9 items-center justify-center rounded-lg border border-slate-200 text-slate-600 hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-40 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800'

  return (
    <div className="mt-4 flex items-center justify-between text-sm text-slate-500 dark:text-slate-400">
      <span>
        Showing {meta.from}-{meta.to} of {meta.total}
      </span>
      <div className="flex items-center gap-2">
        <button className={btn} disabled={meta.current_page <= 1} onClick={() => onPage(meta.current_page - 1)} aria-label="Previous page">
          <ChevronLeft className="h-4 w-4" />
        </button>
        <span>
          Page {meta.current_page} / {meta.last_page}
        </span>
        <button className={btn} disabled={meta.current_page >= meta.last_page} onClick={() => onPage(meta.current_page + 1)} aria-label="Next page">
          <ChevronRight className="h-4 w-4" />
        </button>
      </div>
    </div>
  )
}