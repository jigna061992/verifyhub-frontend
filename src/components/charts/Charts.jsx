import { useState } from 'react'

/* Small dependency free SVG charts used on the admin overview. */

const niceMax = (value) => {
  if (value <= 5) return 5
  const pow = 10 ** Math.floor(Math.log10(value))
  const n = value / pow
  const step = n <= 1 ? 1 : n <= 2 ? 2 : n <= 2.5 ? 2.5 : n <= 5 ? 5 : 10

  return step * pow
}

const compact = (n) => (n >= 1000 ? `${+(n / 1000).toFixed(1)}k` : String(n))

// Smooth curve through the points (Catmull-Rom to Bezier)
const smooth = (pts) => {
  if (pts.length < 2) return ''
  let d = `M${pts[0][0]},${pts[0][1]}`
  for (let i = 0; i < pts.length - 1; i++) {
    const p0 = pts[i - 1] || pts[i]
    const p1 = pts[i]
    const p2 = pts[i + 1]
    const p3 = pts[i + 2] || p2
    const c1 = [p1[0] + (p2[0] - p0[0]) / 6, p1[1] + (p2[1] - p0[1]) / 6]
    const c2 = [p2[0] - (p3[0] - p1[0]) / 6, p2[1] - (p3[1] - p1[1]) / 6]
    d += ` C${c1[0]},${c1[1]} ${c2[0]},${c2[1]} ${p2[0]},${p2[1]}`
  }
  return d
}

function Legend({ items }) {
  return (
    <div className="flex flex-wrap items-center justify-end gap-x-4 gap-y-1 text-xs text-slate-600 dark:text-slate-300">
      {items.map((i) => (
        <span key={i.label} className="inline-flex items-center gap-1.5">
          <span className="h-2.5 w-2.5 rounded-full" style={{ background: i.color }} />
          {i.label}
        </span>
      ))}
    </div>
  )
}

function Tip({ x, title, rows }) {
  return (
    <div
      className="pointer-events-none absolute top-2 z-10 min-w-[140px] rounded-lg bg-slate-900 px-3 py-2 text-xs text-white shadow-lg ring-1 ring-white/10"
      style={{ left: `${x}%`, transform: x > 60 ? 'translateX(-105%)' : 'translateX(8px)' }}
    >
      <div className="mb-1 font-semibold">{title}</div>
      {rows.map((r) => (
        <div key={r.label} className="flex items-center justify-between gap-4">
          <span className="inline-flex items-center gap-1.5">
            <span className="h-2 w-2 rounded-sm" style={{ background: r.color }} />
            {r.label}
          </span>
          <span className="font-semibold">{r.value}</span>
        </div>
      ))}
    </div>
  )
}

/* ---------------- Monthly trend: verified / failed / pending ---------------- */

export function TrendChart({ data }) {
  const [hover, setHover] = useState(null)
  const W = 640, H = 260, L = 38, R = 14, T = 12, B = 28
  const max = niceMax(Math.max(...data.flatMap((d) => [d.verified, d.failed, d.pending]), 1))
  const x = (i) => L + (i * (W - L - R)) / Math.max(data.length - 1, 1)
  const y = (v) => T + (1 - v / max) * (H - T - B)
  const series = [
    { key: 'verified', label: 'Verified', color: '#2f55e8' },
    { key: 'failed', label: 'Failed', color: '#e5484d' },
    { key: 'pending', label: 'Pending', color: '#f5a524' },
  ]
  const ticks = [0, 1, 2, 3, 4, 5].map((i) => (max / 5) * i)
  const pts = (key) => data.map((d, i) => [x(i), y(d[key])])
  const area = `${smooth(pts('verified'))} L${x(data.length - 1)},${y(0)} L${x(0)},${y(0)} Z`

  return (
    <div>
      <Legend items={series.map((s) => ({ label: s.label, color: s.color }))} />
      <div className="relative mt-2">
        <svg viewBox={`0 0 ${W} ${H}`} className="h-auto w-full" role="img" aria-label="Monthly verification trend">
          <defs>
            <linearGradient id="trendFill" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#2f55e8" stopOpacity="0.28" />
              <stop offset="100%" stopColor="#2f55e8" stopOpacity="0" />
            </linearGradient>
          </defs>
          {ticks.map((t) => (
            <g key={t}>
              <line x1={L} x2={W - R} y1={y(t)} y2={y(t)} className="stroke-slate-200 dark:stroke-slate-700/70" />
              <text x={L - 8} y={y(t) + 4} textAnchor="end" className="fill-slate-400 text-[11px]">{compact(Math.round(t))}</text>
            </g>
          ))}
          <path d={area} fill="url(#trendFill)" />
          {series.map((s) => (
            <g key={s.key}>
              <path d={smooth(pts(s.key))} fill="none" stroke={s.color} strokeWidth="2.2" strokeLinecap="round" strokeDasharray={s.key === 'pending' ? '5 4' : undefined} />
              {data.map((d, i) => (
                <circle key={i} cx={x(i)} cy={y(d[s.key])} r="3.6" className="fill-white dark:fill-slate-900" stroke={s.color} strokeWidth="2" />
              ))}
            </g>
          ))}
          {data.map((d, i) => (
            <g key={d.label}>
              <text x={x(i)} y={H - 8} textAnchor="middle" className="fill-slate-500 text-[11px] dark:fill-slate-400">{d.label}</text>
              <rect x={x(i) - 28} y={T} width="56" height={H - T - B} fill="transparent" onMouseEnter={() => setHover(i)} onMouseLeave={() => setHover(null)} />
            </g>
          ))}
        </svg>
        {hover !== null && (
          <Tip
            x={(x(hover) / W) * 100}
            title={data[hover].label}
            rows={series.map((s) => ({ label: s.label, color: s.color, value: data[hover][s.key] }))}
          />
        )}
      </div>
    </div>
  )
}

/* ---------------- Donut: share of verifications by service ---------------- */

export function DonutChart({ items, colors }) {
  const total = items.reduce((a, i) => a + i.total, 0)
  const R = 70, C = 2 * Math.PI * R
  let offset = 0

  return (
    <svg viewBox="0 0 200 200" className="mx-auto h-48 w-48" role="img" aria-label="Verifications by service">
      <circle cx="100" cy="100" r={R} fill="none" strokeWidth="26" className="stroke-slate-100 dark:stroke-slate-800" />
      {total > 0 &&
        items.map((i) => {
          const len = (i.total / total) * C
          const seg = (
            <circle
              key={i.code}
              cx="100" cy="100" r={R} fill="none" strokeWidth="26"
              stroke={colors[i.code] || '#64748b'}
              strokeDasharray={`${Math.max(len - 3, 0)} ${C}`}
              strokeDashoffset={-offset}
              transform="rotate(-90 100 100)"
            />
          )
          offset += len
          return seg
        })}
      <text x="100" y="102" textAnchor="middle" className="fill-slate-900 text-[28px] font-bold dark:fill-white">{total}</text>
      <text x="100" y="120" textAnchor="middle" className="fill-slate-500 text-[11px] dark:fill-slate-400">total requests</text>
    </svg>
  )
}

/* ---------------- Revenue vs provider cost, with margin line ---------------- */

export function RevenueChart({ data }) {
  const [hover, setHover] = useState(null)
  const W = 640, H = 260, L = 50, R = 14, T = 12, B = 28
  const max = niceMax(Math.max(...data.flatMap((d) => [d.revenue, d.cost, d.margin]), 1))
  const slot = (W - L - R) / data.length
  const y = (v) => T + (1 - v / max) * (H - T - B)
  const cx = (i) => L + slot * i + slot / 2
  const ticks = [0, 1, 2, 3, 4, 5].map((i) => (max / 5) * i)
  const line = smooth(data.map((d, i) => [cx(i), y(d.margin)]))
  const inr = (n) => `₹${Number(n).toLocaleString('en-IN')}`

  return (
    <div>
      <Legend items={[{ label: 'Gross margin', color: '#16a34a' }, { label: 'Revenue', color: '#2f55e8' }, { label: 'Provider cost', color: '#94a3b8' }]} />
      <div className="relative mt-2">
        <svg viewBox={`0 0 ${W} ${H}`} className="h-auto w-full" role="img" aria-label="Revenue analytics">
          {ticks.map((t) => (
            <g key={t}>
              <line x1={L} x2={W - R} y1={y(t)} y2={y(t)} className="stroke-slate-200 dark:stroke-slate-700/70" />
              <text x={L - 8} y={y(t) + 4} textAnchor="end" className="fill-slate-400 text-[11px]">₹{compact(Math.round(t))}</text>
            </g>
          ))}
          {data.map((d, i) => (
            <g key={d.label}>
              <rect x={cx(i) - 22} y={y(d.revenue)} width="20" height={Math.max(y(0) - y(d.revenue), 0)} rx="3" fill="#2f55e8" opacity={hover === null || hover === i ? 1 : 0.55} />
              <rect x={cx(i) + 2} y={y(d.cost)} width="20" height={Math.max(y(0) - y(d.cost), 0)} rx="3" className="fill-slate-300 dark:fill-slate-500/70" />
              <text x={cx(i)} y={H - 8} textAnchor="middle" className="fill-slate-500 text-[11px] dark:fill-slate-400">{d.label}</text>
              <rect x={cx(i) - slot / 2} y={T} width={slot} height={H - T - B} fill="transparent" onMouseEnter={() => setHover(i)} onMouseLeave={() => setHover(null)} />
            </g>
          ))}
          <path d={line} fill="none" stroke="#16a34a" strokeWidth="2.2" strokeLinecap="round" />
          {data.map((d, i) => <circle key={i} cx={cx(i)} cy={y(d.margin)} r="3.6" fill="#16a34a" />)}
        </svg>
        {hover !== null && (
          <Tip
            x={(cx(hover) / W) * 100}
            title={data[hover].label}
            rows={[
              { label: 'Gross margin', color: '#16a34a', value: inr(data[hover].margin) },
              { label: 'Revenue', color: '#2f55e8', value: inr(data[hover].revenue) },
              { label: 'Provider cost', color: '#94a3b8', value: inr(data[hover].cost) },
            ]}
          />
        )}
      </div>
    </div>
  )
}

/* ---------------- Gauge: overall success rate ---------------- */

export function GaugeChart({ value }) {
  const R = 80, CX = 100, CY = 100
  const point = (pct) => {
    const a = Math.PI * (1 - pct / 100)
    return [CX + R * Math.cos(a), CY - R * Math.sin(a)]
  }
  const arc = (from, to) => {
    const [x1, y1] = point(from)
    const [x2, y2] = point(to)
    return `M${x1},${y1} A${R},${R} 0 ${to - from > 50 ? 1 : 0} 1 ${x2},${y2}`
  }
  const has = value !== null && value !== undefined
  const v = has ? Math.min(Math.max(value, 0), 100) : 0

  return (
    <svg viewBox="0 0 200 120" className="mx-auto h-auto w-full max-w-[260px]" role="img" aria-label="Verification success rate">
      <path d={arc(0, 100)} fill="none" strokeWidth="22" strokeLinecap="round" className="stroke-slate-100 dark:stroke-slate-800" />
      {has && v > 0 && <path d={arc(0, Math.max(v - 1.5, 0.5))} fill="none" strokeWidth="22" strokeLinecap="round" stroke="#16a34a" />}
      {has && v < 100 && <path d={arc(Math.min(v + 1.5, 99.5), 100)} fill="none" strokeWidth="22" strokeLinecap="round" stroke="#e5484d" />}
      <text x="100" y="86" textAnchor="middle" className="fill-slate-900 text-[28px] font-bold dark:fill-white">{has ? `${value}%` : '-'}</text>
      <text x="100" y="104" textAnchor="middle" className="fill-slate-500 text-[11px] dark:fill-slate-400">{has ? 'verified' : 'no data yet'}</text>
    </svg>
  )
}

/* ---------------- Daily bars: verified / failed / pending per day (retailer overview) ---------------- */

export function DailyBars({ data }) {
  const [hover, setHover] = useState(null)
  const W = 640, H = 260, L = 34, R = 10, T = 12, B = 28
  const max = Math.max(...data.map((d) => d.verified + d.failed + d.pending), 1)
  const top = max <= 4 ? max : niceMax(max)
  const slot = (W - L - R) / data.length
  const y = (v) => T + (1 - v / top) * (H - T - B)
  const cx = (i) => L + slot * i + slot / 2
  const ticks = top <= 4 ? Array.from({ length: top + 1 }, (_, i) => i) : [0, 1, 2, 3, 4].map((i) => (top / 4) * i)
  const parts = [
    { key: 'verified', label: 'Verified', color: '#2f55e8' },
    { key: 'failed', label: 'Failed', color: '#e5484d' },
    { key: 'pending', label: 'Pending', color: '#e0a21c' },
  ]

  return (
    <div>
      <Legend items={parts.map((p) => ({ label: p.label, color: p.color }))} />
      <div className="relative mt-2">
        <svg viewBox={`0 0 ${W} ${H}`} className="h-auto w-full" role="img" aria-label="Verifications in the last 7 days">
          {ticks.map((t) => (
            <g key={t}>
              <line x1={L} x2={W - R} y1={y(t)} y2={y(t)} className="stroke-slate-200 dark:stroke-slate-700/70" />
              <text x={L - 8} y={y(t) + 4} textAnchor="end" className="fill-slate-400 text-[11px]">{Math.round(t)}</text>
            </g>
          ))}
          {data.map((d, i) => {
            let base = 0
            return (
              <g key={d.label}>
                {parts.map((p) => {
                  const h = y(base) - y(base + d[p.key])
                  const rect = d[p.key] > 0 && <rect key={p.key} x={cx(i) - 15} y={y(base + d[p.key])} width="30" height={h} rx="3" fill={p.color} />
                  base += d[p.key]
                  return rect
                })}
                <text x={cx(i)} y={H - 8} textAnchor="middle" className="fill-slate-500 text-[11px] dark:fill-slate-400">{d.label}</text>
                <rect x={cx(i) - slot / 2} y={T} width={slot} height={H - T - B} fill="transparent" onMouseEnter={() => setHover(i)} onMouseLeave={() => setHover(null)} />
              </g>
            )
          })}
        </svg>
        {hover !== null && (
          <Tip x={(cx(hover) / W) * 100} title={data[hover].label} rows={parts.map((p) => ({ label: p.label, color: p.color, value: data[hover][p.key] }))} />
        )}
      </div>
    </div>
  )
}

/* ---------------- BarSeries: many categories, stacked or side by side (reports) ---------------- */

// data: [{ label, ...values }], series: [{ key, label, color }]
export function BarSeries({ data, series, stacked = false, money = false, height = 320 }) {
  const [hover, setHover] = useState(null)
  const W = 1000, H = height, L = 52, R = 12, T = 14
  const rotate = data.length > 8
  const B = rotate ? 64 : 32
  const total = (d) => (stacked ? series.reduce((a, s) => a + (d[s.key] || 0), 0) : Math.max(...series.map((s) => d[s.key] || 0)))
  const raw = Math.max(...data.map(total), 1)
  const top = raw <= 5 && !money ? Math.ceil(raw) : niceMax(raw)
  const steps = raw <= 5 && !money ? Math.max(Math.ceil(raw), 1) : 5
  const ticks = Array.from({ length: steps + 1 }, (_, i) => (top / steps) * i)
  const slot = (W - L - R) / Math.max(data.length, 1)
  const barW = stacked ? Math.min(slot * 0.62, 34) : Math.min((slot * 0.7) / series.length, 22)
  const y = (v) => T + (1 - v / top) * (H - T - B)
  const cx = (i) => L + slot * i + slot / 2
  const fmt = (n) => (money ? `₹${Number(n).toLocaleString('en-IN')}` : n)
  // Show about 12 labels at most when there are many bars
  const every = Math.ceil(data.length / (rotate ? 30 : 12))

  return (
    <div>
      <Legend items={series.map((s) => ({ label: s.label, color: s.color }))} />
      <div className="relative mt-2">
        <svg viewBox={`0 0 ${W} ${H}`} className="h-auto w-full" role="img">
          {ticks.map((t) => (
            <g key={t}>
              <line x1={L} x2={W - R} y1={y(t)} y2={y(t)} className="stroke-slate-200 dark:stroke-slate-700/70" />
              <text x={L - 8} y={y(t) + 4} textAnchor="end" className="fill-slate-500 text-[12px] dark:fill-slate-400">
                {money ? `₹${compact(Math.round(t))}` : Math.round(t)}
              </text>
            </g>
          ))}
          {data.map((d, i) => {
            let base = 0
            return (
              <g key={d.label + i}>
                {series.map((s, si) => {
                  const v = d[s.key] || 0
                  if (v <= 0) {
                    return null
                  }
                  const x = stacked ? cx(i) - barW / 2 : cx(i) - (barW * series.length) / 2 + si * barW
                  const yTop = stacked ? y(base + v) : y(v)
                  const h = stacked ? y(base) - y(base + v) : y(0) - y(v)
                  if (stacked) base += v
                  return <rect key={s.key} x={x} y={yTop} width={barW - (stacked ? 0 : 2)} height={Math.max(h, 1)} rx="2" fill={s.color} opacity={hover === null || hover === i ? 1 : 0.55} />
                })}
                {i % every === 0 && (
                  <text
                    x={cx(i)} y={H - B + 18}
                    textAnchor={rotate ? 'end' : 'middle'}
                    transform={rotate ? `rotate(-35 ${cx(i)} ${H - B + 18})` : undefined}
                    className="fill-slate-500 text-[12px] dark:fill-slate-400"
                  >
                    {d.label.length > 16 ? `${d.label.slice(0, 15)}…` : d.label}
                  </text>
                )}
                <rect x={cx(i) - slot / 2} y={T} width={slot} height={H - T - B} fill="transparent" onMouseEnter={() => setHover(i)} onMouseLeave={() => setHover(null)} />
              </g>
            )
          })}
        </svg>
        {hover !== null && (
          <Tip
            x={(cx(hover) / W) * 100}
            title={data[hover].label}
            rows={series.map((s) => ({ label: s.label, color: s.color, value: fmt(data[hover][s.key] || 0) }))}
          />
        )}
      </div>
    </div>
  )
}

/* ---------------- Stacked bars with slanted labels: many days or months (reports) ---------------- */

export function StackedBars({ data, height = 300 }) {
  const [hover, setHover] = useState(null)
  const many = data.length > 12
  const W = 900, L = 34, R = 10, T = 12, B = many ? 62 : 32
  const H = height
  const max = Math.max(...data.map((d) => d.verified + d.failed + d.pending), 1)
  const top = max <= 8 ? max : niceMax(max)
  const slot = (W - L - R) / data.length
  const barW = Math.min(slot * 0.7, 34)
  const y = (v) => T + (1 - v / top) * (H - T - B)
  const cx = (i) => L + slot * i + slot / 2
  const ticks = top <= 8 ? Array.from({ length: top + 1 }, (_, i) => i) : [0, 1, 2, 3, 4].map((i) => (top / 4) * i)
  const parts = [
    { key: 'verified', label: 'Verified', color: '#2f55e8' },
    { key: 'failed', label: 'Failed', color: '#e5484d' },
    { key: 'pending', label: 'Pending', color: '#e0a21c' },
  ]
  // Label every bar when there are few, otherwise about 15 labels in total
  const every = Math.max(1, Math.ceil(data.length / 15))

  return (
    <div>
      <Legend items={parts.map((p) => ({ label: p.label, color: p.color }))} />
      <div className="relative mt-2">
        <svg viewBox={`0 0 ${W} ${H}`} className="h-auto w-full" role="img" aria-label="Verifications by outcome">
          {ticks.map((t) => (
            <g key={t}>
              <line x1={L} x2={W - R} y1={y(t)} y2={y(t)} className="stroke-slate-200 dark:stroke-slate-700/70" />
              <text x={L - 8} y={y(t) + 4} textAnchor="end" className="fill-slate-400 text-[11px]">{Math.round(t)}</text>
            </g>
          ))}
          {data.map((d, i) => {
            let base = 0
            return (
              <g key={d.label + i}>
                {parts.map((p) => {
                  const h = y(base) - y(base + d[p.key])
                  const rect = d[p.key] > 0 && <rect key={p.key} x={cx(i) - barW / 2} y={y(base + d[p.key])} width={barW} height={h} rx="2" fill={p.color} opacity={hover === null || hover === i ? 1 : 0.55} />
                  base += d[p.key]
                  return rect
                })}
                {i % every === 0 && (
                  <text
                    x={cx(i)} y={H - B + 18} textAnchor={many ? 'end' : 'middle'}
                    transform={many ? `rotate(-40 ${cx(i)} ${H - B + 18})` : undefined}
                    className="fill-slate-500 text-[11px] dark:fill-slate-400"
                  >{d.label}</text>
                )}
                <rect x={cx(i) - slot / 2} y={T} width={slot} height={H - T - B} fill="transparent" onMouseEnter={() => setHover(i)} onMouseLeave={() => setHover(null)} />
              </g>
            )
          })}
        </svg>
        {hover !== null && (
          <Tip x={(cx(hover) / W) * 100} title={data[hover].label} rows={parts.map((p) => ({ label: p.label, color: p.color, value: data[hover][p.key] }))} />
        )}
      </div>
    </div>
  )
}
