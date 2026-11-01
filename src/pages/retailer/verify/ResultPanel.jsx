import { Link } from 'react-router-dom'
import { CheckCircle2, XCircle } from 'lucide-react'
import { formatINR } from '../../../utils/format'
import DownloadButton from '../../../components/ui/DownloadButton'

const prettyKey = (key) => key.replace(/_/g, ' ').replace(/^\w/, (c) => c.toUpperCase())

const showValue = (key, value) => {
  if (key.endsWith('_at') && value) {
    const d = new Date(value)
    if (!Number.isNaN(d.getTime())) return d.toLocaleString('en-IN', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })
  }
  return String(value)
}

// Final answer of any single check (PAN, Bank, GST, Aadhaar, e-Sign)
export default function ResultPanel({ result, onReset }) {
  const ok = result.status === 'success'

  return (
    <div className="max-w-xl">
      <div className={`flex items-start gap-3 rounded-xl p-4 ${ok ? 'bg-emerald-50 dark:bg-emerald-950' : 'bg-red-50 dark:bg-red-950'}`}>
        {ok ? <CheckCircle2 className="mt-0.5 h-6 w-6 text-emerald-600" /> : <XCircle className="mt-0.5 h-6 w-6 text-red-600" />}
        <div>
          <div className="font-semibold text-slate-900 dark:text-white">{ok ? 'Verification successful' : 'Verification failed'}</div>
          <div className="text-sm text-slate-600 dark:text-slate-300">
            {ok ? `${formatINR(result.charged)} charged.` : `${result.failure_reason || 'Could not verify.'} No amount charged.`}
          </div>
        </div>
      </div>

      <dl className="mt-4 divide-y divide-slate-100 text-sm dark:divide-slate-800">
        <div className="flex justify-between py-2">
          <dt className="text-slate-500">Checked</dt>
          <dd className="font-mono text-slate-800 dark:text-slate-100">{result.input_masked}</dd>
        </div>
        {result.result &&
          Object.entries(result.result)
            .filter(([, value]) => value !== null && value !== undefined && value !== '')
            .map(([key, value]) => (
              <div key={key} className="flex justify-between gap-4 py-2">
                <dt className="text-slate-500">{prettyKey(key)}</dt>
                <dd className="break-all text-right font-semibold text-slate-800 dark:text-slate-100">{showValue(key, value)}</dd>
              </div>
            ))}
      </dl>

      <div className="mt-5 flex flex-wrap gap-3">
        <button onClick={onReset} className="rounded-xl bg-brand-700 px-5 py-2.5 text-sm font-semibold text-white hover:bg-brand-800">
          Verify another
        </button>
        {ok && <DownloadButton url={`/retailer/verifications/${result.id}/receipt`} filename="receipt.pdf" label="Receipt (PDF)" />}
        <Link
          to="/retailer/history"
          className="rounded-xl border border-slate-300 px-5 py-2.5 text-sm font-semibold text-slate-700 hover:bg-slate-50 dark:border-slate-700 dark:text-slate-200 dark:hover:bg-slate-800"
        >
          View history
        </Link>
      </div>
    </div>
  )
}
