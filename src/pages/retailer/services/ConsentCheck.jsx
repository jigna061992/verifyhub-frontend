// The exact consent text (typed values filled in) with the tick box the retailer must confirm
export default function ConsentCheck({ consent, vars = {}, checked, onChange, error, disabled }) {
  const text = Object.entries(vars).reduce((t, [key, value]) => t.replaceAll(`{${key}}`, value || '...'), consent?.text ?? '')

  return (
    <div>
      <label className="flex cursor-pointer items-start gap-3 rounded-xl border border-dashed border-slate-300 bg-slate-50 p-4 text-sm leading-relaxed text-slate-600 dark:border-slate-700 dark:bg-slate-800/40 dark:text-slate-300">
        <input
          type="checkbox"
          checked={checked}
          disabled={disabled}
          onChange={(e) => onChange(e.target.checked)}
          className="mt-1 h-4 w-4 shrink-0 rounded border-slate-300 text-brand-700"
        />
        <span>
          {text}
          {consent?.version && <span className="mt-1 block text-[11px] text-slate-400">Consent version {consent.version}</span>}
        </span>
      </label>
      {error && <p className="mt-1 text-xs text-red-600">{error}</p>}
    </div>
  )
}
