// Shows the exact consent text (with the typed values filled in) and the tick box the retailer must confirm
export default function ConsentBox({ consent, vars, checked, onChange, error }) {
  const text = Object.entries(vars).reduce((t, [key, value]) => t.replaceAll(`{${key}}`, value || '...'), consent.text)

  return (
    <div className="space-y-2">
      <div className="rounded-xl border border-slate-200 bg-slate-50 p-4 dark:border-slate-800 dark:bg-slate-800/50">
        <div className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-400">Customer consent ({consent.version})</div>
        <p className="text-sm leading-relaxed text-slate-700 dark:text-slate-200">{text}</p>
      </div>
      <label className="flex items-start gap-2 text-sm text-slate-700 dark:text-slate-200">
        <input type="checkbox" checked={checked} onChange={(e) => onChange(e.target.checked)} className="mt-1 h-4 w-4 rounded border-slate-300 text-brand-700" />
        <span>The customer has read the consent above and agreed to it. I confirm this on their behalf.</span>
      </label>
      {error && <p className="text-xs text-red-600">{error}</p>}
    </div>
  )
}
