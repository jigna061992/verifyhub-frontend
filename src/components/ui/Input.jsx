export const inputClass =
  'w-full rounded-xl border border-slate-300 bg-white px-3 py-2.5 text-sm text-slate-900 outline-none transition focus:border-brand-500 focus:ring-2 focus:ring-brand-200 disabled:opacity-60 dark:border-slate-700 dark:bg-slate-800 dark:text-white dark:focus:ring-brand-900'

export default function Input({ label, error, hint, className = '', ...props }) {
  return (
    <div className={className}>
      <label className="mb-1.5 block text-xs font-semibold text-slate-600 dark:text-slate-300">{label}</label>
      <input
        {...props}
        className={`${inputClass} ${error ? 'border-red-400 focus:border-red-500 focus:ring-red-200' : ''}`}
      />
      {hint && !error && <p className="mt-1 text-xs text-slate-400">{hint}</p>}
      {error && <p className="mt-1 text-xs text-red-600">{error}</p>}
    </div>
  )
}