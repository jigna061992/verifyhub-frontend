export default function Card({ title, subtitle, icon: Icon, action, children, className = '', flush = false }) {
  return (
    <section className={`rounded-2xl border border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900 ${className}`}>
      {(title || action) && (
        <div className={`flex items-start justify-between gap-3 ${flush ? 'p-5 pb-3' : 'px-5 pt-5'}`}>
          <div className="flex items-start gap-2.5">
            {Icon && <Icon className="mt-0.5 h-[18px] w-[18px] shrink-0 text-brand-600 dark:text-brand-400" />}
            <div>
              <h3 className="text-[15px] font-semibold text-slate-900 dark:text-white">{title}</h3>
              {subtitle && <p className="mt-0.5 text-xs text-slate-500 dark:text-slate-400">{subtitle}</p>}
            </div>
          </div>
          {action}
        </div>
      )}
      <div className={flush ? '' : 'p-5 pt-4'}>{children}</div>
    </section>
  )
}
