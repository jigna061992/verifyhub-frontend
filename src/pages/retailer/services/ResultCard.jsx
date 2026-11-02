import { Link } from 'react-router-dom'
import { CheckCircle2, XCircle, UserCheck, UserX } from 'lucide-react'
import { formatINR } from '../../../utils/format'
import DownloadButton from '../../../components/ui/DownloadButton'
import { primaryBtn, ghostBtn } from './helpers'

const HIDDEN = ['name_match', 'name_match_score']
const prettyKey = (key) => key.replace(/_/g, ' ').replace(/^\w/, (c) => c.toUpperCase())

const showValue = (value) => {
  if (value === true) return 'Yes'
  if (value === false) return 'No'
  return String(value)
}

// Result of one check, shown in the right panel of a service page
export default function ResultCard({ result, onReset, resetLabel = 'Verify another', historyTo = '/retailer/history' }) {
  const ok = result.status === 'success'
  const data = result.result ?? {}
  const hasMatch = ok && data.name_match

  return (
    <div>
      <div className={`flex items-start gap-3 rounded-xl p-4 ${ok ? 'bg-emerald-50 dark:bg-emerald-950' : 'bg-red-50 dark:bg-red-950'}`}>
        {ok ? <CheckCircle2 className="mt-0.5 h-6 w-6 text-emerald-600" /> : <XCircle className="mt-0.5 h-6 w-6 text-red-600" />}
        <div>
          <div className="font-semibold text-slate-900 dark:text-white">{ok ? 'Verification successful' : 'Verification failed'}</div>
          <div className="text-sm text-slate-600 dark:text-slate-300">
            {ok ? `${formatINR(result.charged)} charged.` : `${result.failure_reason || 'Could not verify.'} No amount charged.`}
          </div>
        </div>
      </div>

      {hasMatch && (
        <div
          className={`mt-3 flex items-center gap-2 rounded-xl px-4 py-3 text-sm font-semibold ${
            data.name_match === 'match'
              ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300'
              : 'bg-amber-50 text-amber-700 dark:bg-amber-950 dark:text-amber-300'
          }`}
        >
          {data.name_match === 'match' ? <UserCheck className="h-4 w-4" /> : <UserX className="h-4 w-4" />}
          Name {data.name_match === 'match' ? 'matches' : 'does not match'} ({data.name_match_score}%)
        </div>
      )}

      <dl className="mt-4 divide-y divide-slate-100 text-sm dark:divide-slate-800">
        <div className="flex justify-between py-2">
          <dt className="text-slate-500">Checked</dt>
          <dd className="font-mono text-slate-800 dark:text-slate-100">{result.input_masked}</dd>
        </div>
        {result.customer_name && (
          <div className="flex justify-between py-2">
            <dt className="text-slate-500">Customer name</dt>
            <dd className="font-semibold text-slate-800 dark:text-slate-100">{result.customer_name}</dd>
          </div>
        )}
        {Object.entries(data)
          .filter(([key, value]) => !HIDDEN.includes(key) && value !== null && value !== undefined && value !== '')
          .map(([key, value]) => (
            <div key={key} className="flex justify-between gap-4 py-2">
              <dt className="text-slate-500">{prettyKey(key)}</dt>
              <dd className="break-all text-right font-semibold text-slate-800 dark:text-slate-100">{showValue(value)}</dd>
            </div>
          ))}
      </dl>

      <div className="mt-5 flex flex-wrap gap-3">
        <button onClick={onReset} className={primaryBtn}>{resetLabel}</button>
        {ok && <DownloadButton url={`/retailer/verifications/${result.id}/receipt`} filename="receipt.pdf" label="Receipt (PDF)" />}
        <Link to={historyTo} className={ghostBtn}>View history</Link>
      </div>
    </div>
  )
}
