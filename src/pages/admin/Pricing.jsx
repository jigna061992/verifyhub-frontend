import { useCallback, useEffect, useState } from 'react'
import { Download, Save, Tags, UserCog, ListChecks, RotateCcw } from 'lucide-react'
import api from '../../api/axios'
import Toast from '../../components/ui/Toast'
import StatusBadge from '../../components/ui/StatusBadge'
import { inputClass } from '../../components/ui/Input'
import { formatINR } from '../../utils/format'
import { getErrorMessage } from '../../utils/errors'
import { metaFor, BUNDLE_PARTS } from '../../utils/serviceMeta'

/* ---------- small helpers ---------- */
const round2 = (n) => Math.round(Number(n) * 100) / 100
const validAmount = (v) => v !== '' && v != null && Number.isFinite(Number(v)) && Number(v) >= 0 && Number(v) <= 100000

const marginOf = (price, cost) => {
  const margin = Number(price) - Number(cost)
  const pct = Number(price) > 0 ? Math.round((margin / Number(price)) * 100) : 0
  return { margin, pct }
}

const AVATAR_COLORS = ['bg-pink-700', 'bg-sky-600', 'bg-violet-600', 'bg-amber-600', 'bg-emerald-600', 'bg-rose-600']
const initials = (name) =>
  name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((w) => w[0].toUpperCase())
    .join('')

function ServiceIcon({ code }) {
  const { icon: Icon, tone } = metaFor(code)
  return (
    <span className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-lg ${tone}`}>
      <Icon className="h-4 w-4" />
    </span>
  )
}

function SectionCard({ icon: Icon, title, subtitle, action, children }) {
  return (
    <section className="rounded-2xl border border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900">
      <div className="flex flex-col gap-3 px-5 py-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-start gap-2.5">
          <Icon className="mt-0.5 h-5 w-5 text-brand-700 dark:text-brand-300" />
          <div>
            <h2 className="font-semibold text-slate-900 dark:text-white">{title}</h2>
            <p className="text-sm text-slate-500 dark:text-slate-400">{subtitle}</p>
          </div>
        </div>
        {action}
      </div>
      {children}
    </section>
  )
}

// Spreadsheet programs run text starting with = + - @ as a formula, so such text gets a leading quote
const csvCell = (value) => {
  let text = String(value ?? '')
  if (/^[=+\-@]/.test(text)) text = `'${text}`
  return `"${text.replace(/"/g, '""')}"`
}

function exportRateCard(services, cards) {
  const rows = [['Retailer', 'Retailer code', 'Service', 'Price (INR)', 'Type', 'Provider cost (INR)', 'Margin (INR)']]

  services.forEach((s) =>
    rows.push(['All retailers', '', s.name, s.default_price, 'Default', s.provider_cost, round2(s.default_price - s.provider_cost)])
  )

  cards.forEach((c) => {
    c.prices.forEach((p) => {
      const s = services.find((x) => x.id === p.service_id)
      if (s && !s.auto_price && round2(p.price) !== round2(s.default_price)) {
        rows.push([c.business_name, c.code, s.name, p.price, 'Custom', s.provider_cost, round2(p.price - s.provider_cost)])
      }
    })
  })

  const csv = rows.map((r) => r.map(csvCell).join(',')).join('\r\n')
  const url = URL.createObjectURL(new Blob([csv], { type: 'text/csv;charset=utf-8;' }))
  const link = document.createElement('a')
  link.href = url
  link.download = `rate-card-${new Date().toISOString().slice(0, 10)}.csv`
  link.click()
  URL.revokeObjectURL(url)
}

/* ---------- 1. Default rate card ---------- */
function DefaultRateCard({ services, drafts, setDrafts, onSave, saving }) {
  // Complete KYC (auto_price) is never edited and never saved. It is shown as the sum of its 4 services.
  const editable = services.filter((s) => !s.auto_price)

  const changed = editable.filter((s) => {
    const d = drafts[s.id]
    return d && (round2(d.default_price) !== round2(s.default_price) || round2(d.provider_cost) !== round2(s.provider_cost))
  })
  const allValid = editable.every((s) => drafts[s.id] && validAmount(drafts[s.id].default_price) && validAmount(drafts[s.id].provider_cost))

  const sumOf = (field) =>
    round2(services.filter((x) => BUNDLE_PARTS.includes(x.code)).reduce((t, x) => t + Number(drafts[x.id]?.[field] || 0), 0))

  const setField = (id, field) => (e) => setDrafts({ ...drafts, [id]: { ...drafts[id], [field]: e.target.value } })

  return (
    <SectionCard
      icon={Tags}
      title="Default rate card"
      subtitle="Applied to every retailer without a custom price"
      action={
        <button
          onClick={() => onSave(changed)}
          disabled={changed.length === 0 || !allValid || saving}
          className="inline-flex items-center justify-center gap-2 rounded-xl bg-brand-700 px-4 py-2.5 text-sm font-semibold text-white hover:bg-brand-800 disabled:cursor-not-allowed disabled:opacity-40"
        >
          <Save className="h-4 w-4" />
          {saving ? 'Saving...' : 'Save defaults'}
        </button>
      }
    >
      <div className="overflow-x-auto border-t border-slate-100 dark:border-slate-800">
        <table className="w-full min-w-[900px] text-left text-sm">
          <thead>
            <tr className="bg-slate-50 text-[11px] uppercase tracking-wide text-slate-400 dark:bg-slate-800/50">
              <th className="px-5 py-3 font-semibold">Service</th>
              <th className="px-3 py-3 font-semibold">Provider cost (₹)</th>
              <th className="px-3 py-3 font-semibold">Retailer selling price (₹)</th>
              <th className="px-3 py-3 font-semibold">Gross margin</th>
              <th className="px-3 py-3 text-right font-semibold">Usage (30d)</th>
              <th className="px-3 py-3 text-right font-semibold">Revenue (30d)</th>
              <th className="px-5 py-3 text-right font-semibold">Margin (30d)</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
            {services.map((s) => {
              const auto = Boolean(s.auto_price)
              const d = auto
                ? { default_price: sumOf('default_price'), provider_cost: sumOf('provider_cost') }
                : drafts[s.id] ?? { default_price: '', provider_cost: '' }
              const ok = validAmount(d.default_price) && validAmount(d.provider_cost)
              const { margin, pct } = marginOf(d.default_price, d.provider_cost)

              return (
                <tr key={s.id} className="text-slate-700 dark:text-slate-200">
                  <td className="px-5 py-3">
                    <div className="flex items-center gap-2.5">
                      <ServiceIcon code={s.code} />
                      <div>
                        <div className="font-semibold">{metaFor(s.code).short}</div>
                        {auto && <div className="text-[11px] text-slate-400">Auto: Aadhaar + PAN + Bank + e-Sign</div>}
                        {!s.enabled && <div className="text-[11px] text-slate-400">disabled</div>}
                      </div>
                    </div>
                  </td>
                  <td className="px-3 py-3">
                    {auto ? (
                      <span className="inline-block w-28 rounded-xl bg-slate-100 px-3 py-2 font-semibold dark:bg-slate-800">
                        {formatINR(d.provider_cost)}
                      </span>
                    ) : (
                      <input
                        type="number"
                        min="0"
                        step="0.01"
                        value={d.provider_cost}
                        onChange={setField(s.id, 'provider_cost')}
                        aria-label={`${s.name} provider cost`}
                        className={`${inputClass} w-28`}
                      />
                    )}
                  </td>
                  <td className="px-3 py-3">
                    {auto ? (
                      <span className="inline-block w-28 rounded-xl bg-slate-100 px-3 py-2 font-semibold dark:bg-slate-800">
                        {formatINR(d.default_price)}
                      </span>
                    ) : (
                      <input
                        type="number"
                        min="0"
                        step="0.01"
                        value={d.default_price}
                        onChange={setField(s.id, 'default_price')}
                        aria-label={`${s.name} selling price`}
                        className={`${inputClass} w-28`}
                      />
                    )}
                  </td>
                  <td className="px-3 py-3 font-semibold">
                    {ok ? (
                      <span className={margin < 0 ? 'text-red-600' : 'text-brand-700 dark:text-brand-300'}>
                        {formatINR(margin)} · {pct}%
                      </span>
                    ) : (
                      <span className="text-slate-400">-</span>
                    )}
                  </td>
                  <td className="px-3 py-3 text-right">{s.usage_30d}</td>
                  <td className="px-3 py-3 text-right">{formatINR(s.revenue_30d)}</td>
                  <td className="px-5 py-3 text-right">{formatINR(s.margin_30d)}</td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>
    </SectionCard>
  )
}

/* ---------- 2. Retailer-specific pricing ---------- */
function RetailerPricing({ retailers, reloadKey, notify, onSaved }) {
  const [retailerId, setRetailerId] = useState('')
  const [items, setItems] = useState(null)
  const [values, setValues] = useState({})
  const [error, setError] = useState('')
  const [saving, setSaving] = useState(false)

  const applyItems = (list) => {
    setItems(list)
    setValues(Object.fromEntries(list.map((i) => [i.service_id, String(i.effective_price)])))
  }

  // Load when a retailer is chosen, and again after the default prices were saved
  useEffect(() => {
    if (!retailerId) {
      setItems(null)
      return
    }

    let cancelled = false
    setItems(null)
    setError('')

    api
      .get(`/admin/retailers/${retailerId}/pricing`)
      .then((res) => !cancelled && applyItems(res.data.services))
      .catch((err) => !cancelled && setError(getErrorMessage(err, 'Unable to load pricing.')))

    return () => {
      cancelled = true
    }
  }, [retailerId, reloadKey])

  // Complete KYC (auto_price) follows the 4 services: it is shown, never typed and never saved
  const editableItems = items ? items.filter((i) => !i.auto_price) : []
  const dirty = items ? editableItems.some((i) => round2(values[i.service_id]) !== round2(i.effective_price)) : false
  const valid = items ? editableItems.every((i) => validAmount(values[i.service_id])) : false

  const bundleTotal = items
    ? round2(items.filter((i) => BUNDLE_PARTS.includes(i.code)).reduce((t, i) => t + Number(values[i.service_id] || 0), 0))
    : 0

  const resetToDefaults = () =>
    setValues(Object.fromEntries(items.map((i) => [i.service_id, String(i.default_price)])))

  const save = async () => {
    setSaving(true)
    try {
      const res = await api.put(`/admin/retailers/${retailerId}/pricing`, {
        prices: editableItems.map((i) => ({ service_id: i.service_id, price: Number(values[i.service_id]) })),
      })
      applyItems(res.data.services)
      notify({ type: 'success', text: 'Retailer pricing saved.' })
      onSaved()
    } catch (err) {
      notify({ type: 'error', text: getErrorMessage(err) })
    } finally {
      setSaving(false)
    }
  }

  return (
    <SectionCard
      icon={UserCog}
      title="Retailer-specific pricing"
      subtitle="Override the default rate for an individual retailer (e.g. volume slabs)"
      action={
        <select
          value={retailerId}
          onChange={(e) => setRetailerId(e.target.value)}
          aria-label="Select retailer"
          className={`${inputClass} sm:w-72`}
        >
          <option value="">Select a retailer</option>
          {retailers.map((r) => (
            <option key={r.id} value={r.id}>
              {r.business_name} · {r.code}
            </option>
          ))}
        </select>
      }
    >
      <div className="border-t border-slate-100 dark:border-slate-800">
        {error && <p className="px-5 pt-4 text-sm text-red-600">{error}</p>}

        {!retailerId && (
          <p className="px-5 py-10 text-center text-sm text-slate-400">Select a retailer to see and edit their prices.</p>
        )}

        {retailerId && !items && !error && <p className="px-5 py-10 text-center text-sm text-slate-400">Loading pricing...</p>}

        {items && (
          <>
            <div className="grid gap-4 p-5 sm:grid-cols-2 xl:grid-cols-4">
              {editableItems.map((i) => {
                const auto = Boolean(i.auto_price)
                const value = auto ? String(bundleTotal) : values[i.service_id] ?? ''
                const ok = validAmount(value)
                const custom = !auto && ok && round2(value) !== round2(i.default_price)
                const { margin, pct } = marginOf(value, i.provider_cost)

                return (
                  <div
                    key={i.service_id}
                    className={`rounded-xl border p-4 ${
                      custom
                        ? 'border-brand-500 bg-brand-50/60 dark:bg-brand-950/40'
                        : 'border-slate-200 bg-slate-50/60 dark:border-slate-800 dark:bg-slate-800/30'
                    }`}
                  >
                    <div className="flex items-center justify-between gap-2">
                      <div className="flex items-center gap-2">
                        <ServiceIcon code={i.code} />
                        <span className="font-semibold text-slate-900 dark:text-white">{metaFor(i.code).short}</span>
                      </div>
                      {auto ? (
                        <span className="rounded-full bg-indigo-100 px-2 py-0.5 text-xs font-semibold text-indigo-700 dark:bg-indigo-950 dark:text-indigo-300">
                          Auto
                        </span>
                      ) : custom ? (
                        <span className="text-xs font-semibold text-brand-700 dark:text-brand-300">● Custom</span>
                      ) : (
                        <span className="rounded-full bg-slate-200 px-2 py-0.5 text-xs font-semibold text-slate-600 dark:bg-slate-700 dark:text-slate-300">
                          Default
                        </span>
                      )}
                    </div>

                    <label className="mb-1.5 mt-4 block text-xs font-semibold text-slate-700 dark:text-slate-200">
                      Selling price for this retailer
                    </label>
                    <div className="flex">
                      <span className="flex items-center rounded-l-xl border border-r-0 border-slate-300 bg-white px-3 text-sm text-slate-500 dark:border-slate-700 dark:bg-slate-800">
                        ₹
                      </span>
                      <input
                        type="number"
                        min="0"
                        step="0.01"
                        value={value}
                        readOnly={auto}
                        disabled={auto}
                        onChange={(e) => setValues({ ...values, [i.service_id]: e.target.value })}
                        aria-label={`${i.name} price for this retailer`}
                        className={`${inputClass} rounded-l-none ${ok ? '' : 'border-red-400'} ${auto ? 'cursor-not-allowed bg-slate-100 dark:bg-slate-800' : ''}`}
                      />
                    </div>
                    {auto && (
                      <p className="mt-1.5 text-[11px] text-slate-500 dark:text-slate-400">
                        Automatic: Aadhaar + PAN + Bank + e-Sign prices of this retailer.
                      </p>
                    )}

                    <dl className="mt-4 space-y-2 text-sm">
                      <div className="flex justify-between">
                        <dt className="text-slate-500 dark:text-slate-400">Default price</dt>
                        <dd className="font-semibold text-slate-900 dark:text-white">{formatINR(i.default_price)}</dd>
                      </div>
                      <div className="flex justify-between">
                        <dt className="text-slate-500 dark:text-slate-400">Provider cost</dt>
                        <dd className="font-semibold text-slate-900 dark:text-white">{formatINR(i.provider_cost)}</dd>
                      </div>
                      <div className="flex justify-between">
                        <dt className="text-slate-500 dark:text-slate-400">Gross margin</dt>
                        <dd className={`font-semibold ${ok && margin < 0 ? 'text-red-600' : 'text-brand-700 dark:text-brand-300'}`}>
                          {ok ? `${formatINR(margin)} (${pct}%)` : '-'}
                        </dd>
                      </div>
                    </dl>
                  </div>
                )
              })}
            </div>

            <div className="flex flex-col-reverse items-stretch justify-end gap-3 border-t border-slate-100 px-5 py-4 sm:flex-row sm:items-center dark:border-slate-800">
              <button
                onClick={resetToDefaults}
                disabled={saving}
                className="inline-flex items-center justify-center gap-2 rounded-xl px-4 py-2.5 text-sm font-semibold text-slate-600 hover:bg-slate-100 disabled:opacity-40 dark:text-slate-300 dark:hover:bg-slate-800"
              >
                <RotateCcw className="h-4 w-4" /> Reset to defaults
              </button>
              <button
                onClick={save}
                disabled={!dirty || !valid || saving}
                className="inline-flex items-center justify-center gap-2 rounded-xl bg-brand-700 px-5 py-2.5 text-sm font-semibold text-white hover:bg-brand-800 disabled:cursor-not-allowed disabled:opacity-40"
              >
                <Save className="h-4 w-4" />
                {saving ? 'Saving...' : 'Save retailer pricing'}
              </button>
            </div>
          </>
        )}
      </div>
    </SectionCard>
  )
}

/* ---------- 3. Active custom rate cards ---------- */
function CustomRateCards({ cards, services }) {
  const rows = cards
    .map((c) => ({ ...c, map: Object.fromEntries(c.prices.map((p) => [p.service_id, p.price])) }))
    .filter((c) => services.some((s) => c.map[s.id] != null && round2(c.map[s.id]) !== round2(s.default_price)))

  return (
    <SectionCard icon={ListChecks} title="Active custom rate cards" subtitle="Retailers currently billed at non-default prices">
      <div className="overflow-x-auto border-t border-slate-100 dark:border-slate-800">
        <table className="w-full min-w-[720px] text-left text-sm">
          <thead>
            <tr className="bg-slate-50 text-[11px] uppercase tracking-wide text-slate-400 dark:bg-slate-800/50">
              <th className="px-5 py-3 font-semibold">Retailer</th>
              {services.map((s) => (
                <th key={s.id} className="px-3 py-3 text-right font-semibold">{metaFor(s.code).short}</th>
              ))}
              <th className="px-5 py-3 font-semibold">Status</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
            {rows.length === 0 && (
              <tr>
                <td colSpan={services.length + 2} className="px-5 py-10 text-center text-slate-400">
                  No retailer has a custom price yet.
                </td>
              </tr>
            )}

            {rows.map((c) => (
              <tr key={c.retailer_id} className="text-slate-700 dark:text-slate-200">
                <td className="px-5 py-3">
                  <div className="flex items-center gap-3">
                    <span
                      className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-lg text-xs font-bold text-white ${
                        AVATAR_COLORS[c.retailer_id % AVATAR_COLORS.length]
                      }`}
                    >
                      {initials(c.business_name)}
                    </span>
                    <div>
                      <div className="font-semibold">{c.business_name}</div>
                      <div className="text-xs text-slate-400">{c.code}</div>
                    </div>
                  </div>
                </td>

                {services.map((s) => {
                  // Complete KYC: the sum of this retailer's prices of the 4 services
                  const price = s.auto_price
                    ? round2(services.filter((x) => BUNDLE_PARTS.includes(x.code)).reduce((t, x) => t + Number(c.map[x.id] ?? x.default_price), 0))
                    : c.map[s.id]
                  const isCustom = price != null && round2(price) !== round2(s.default_price)

                  return (
                    <td
                      key={s.id}
                      className={`px-3 py-3 text-right ${isCustom ? 'font-bold text-slate-900 dark:text-white' : 'text-slate-400'}`}
                    >
                      {formatINR(price ?? s.default_price)}
                    </td>
                  )
                })}

                <td className="px-5 py-3"><StatusBadge status={c.status} /></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </SectionCard>
  )
}

/* ---------- Page ---------- */
export default function Pricing() {
  const [data, setData] = useState(null)
  const [drafts, setDrafts] = useState({})
  const [error, setError] = useState('')
  const [savingDefaults, setSavingDefaults] = useState(false)
  const [reloadKey, setReloadKey] = useState(0)
  const [toast, setToast] = useState(null)
  const closeToast = useCallback(() => setToast(null), [])

  const makeDrafts = (services) =>
    Object.fromEntries(
      services.map((s) => [s.id, { default_price: String(s.default_price), provider_cost: String(s.provider_cost) }])
    )

  const load = useCallback(() => {
    api
      .get('/admin/pricing')
      .then((res) => {
        setData(res.data)
        setDrafts(makeDrafts(res.data.services))
      })
      .catch((err) => setError(getErrorMessage(err, 'Unable to load pricing.')))
  }, [])

  useEffect(() => {
    load()
  }, [load])

  // Refresh only the custom rate cards after a retailer was saved, so unsaved default prices are not lost
  const refreshCards = () =>
    api
      .get('/admin/pricing')
      .then((res) => setData((old) => (old ? { ...old, custom_cards: res.data.custom_cards } : res.data)))
      .catch(() => {})

  const saveDefaults = async (changed) => {
    setSavingDefaults(true)
    try {
      const res = await api.put('/admin/services', {
        services: changed.map((s) => ({
          id: s.id,
          default_price: Number(drafts[s.id].default_price),
          provider_cost: Number(drafts[s.id].provider_cost),
        })),
      })
      setData(res.data)
      setDrafts(makeDrafts(res.data.services))
      setReloadKey((k) => k + 1) // retailer cards show the new default prices
      setToast({ type: 'success', text: 'Default prices saved.' })
    } catch (err) {
      setToast({ type: 'error', text: getErrorMessage(err) })
    } finally {
      setSavingDefaults(false)
    }
  }

  return (
    <div className="space-y-6">
      <Toast toast={toast} onClose={closeToast} />

      <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-center">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-white">Pricing management</h1>
          <p className="text-sm text-slate-500 dark:text-slate-400">Set default selling prices and per-retailer rate cards.</p>
        </div>
        <button
          onClick={() => exportRateCard(data.services, data.custom_cards)}
          disabled={!data}
          className="inline-flex items-center justify-center gap-2 rounded-xl border border-slate-300 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 hover:bg-slate-50 disabled:opacity-40 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200 dark:hover:bg-slate-800"
        >
          <Download className="h-4 w-4" /> Export rate card
        </button>
      </div>

      {error && <p className="text-sm text-red-600">{error}</p>}
      {!data && !error && <p className="text-sm text-slate-400">Loading pricing...</p>}

      {data && (
        <>
          <DefaultRateCard
            services={data.services}
            drafts={drafts}
            setDrafts={setDrafts}
            onSave={saveDefaults}
            saving={savingDefaults}
          />

          <RetailerPricing retailers={data.retailers} reloadKey={reloadKey} notify={setToast} onSaved={refreshCards} />

          <CustomRateCards cards={data.custom_cards} services={data.services} />
        </>
      )}
    </div>
  )
}
