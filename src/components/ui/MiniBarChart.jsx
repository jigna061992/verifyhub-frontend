export default function MiniBarChart({ data }) {
  const max = Math.max(...data.map((d) => d.total), 1)
  const isEmpty = data.every((d) => d.total === 0)

  return (
    <div>
      <div className="flex h-44 items-stretch gap-3">
        {data.map((d) => (
          <div key={d.label} className="flex flex-1 flex-col gap-2">
            <div className="flex flex-1 items-end">
              <div
                title={`${d.label}: ${d.total}`}
                className="w-full rounded-t-md bg-brand-500 dark:bg-brand-400"
                style={{ height: `${(d.total / max) * 100}%`, minHeight: '3px' }}
              />
            </div>
            <span className="text-center text-xs text-slate-400">{d.label}</span>
          </div>
        ))}
      </div>
      {isEmpty && (
        <p className="mt-3 text-center text-xs text-slate-400">
          No verifications yet. Data will appear here once checks start.
        </p>
      )}
    </div>
  )
}