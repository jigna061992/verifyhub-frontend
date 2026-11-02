import { useState } from 'react'
import { Link } from 'react-router-dom'
import { History as HistoryIcon, ListChecks, Lock, Eye, FileText } from 'lucide-react'
import Card from '../../../components/ui/Card'
import Modal from '../../../components/ui/Modal'
import StatusBadge from '../../../components/ui/StatusBadge'
import DownloadButton from '../../../components/ui/DownloadButton'
import { metaFor } from '../../../utils/serviceMeta'
import { formatINR } from '../../../utils/format'
import { refNo, timeAgo, ghostBtn } from './helpers'

const Row = ({ label, children }) => (
  <div className="flex justify-between gap-4 py-2.5">
    <dt className="text-slate-500">{label}</dt>
    <dd className="break-all text-right font-semibold text-slate-800 dark:text-slate-100">{children}</dd>
  </div>
)

// Details of one past check. The provider result (name etc.) is shown only right after the check, so it is not here.
function DetailsModal({ row, onClose }) {
  return (
    <Modal title={row.service_name} subtitle={refNo(row.id)} icon={FileText} onClose={onClose}>
      <dl className="divide-y divide-slate-100 text-sm dark:divide-slate-800">
        <Row label="Status"><StatusBadge status={row.status} /></Row>
        <Row label="Checked"><span className="font-mono">{row.input_masked}</span></Row>
        {row.customer_name && <Row label="Customer name">{row.customer_name}</Row>}
        <Row label="Charged">{row.charged > 0 ? formatINR(row.charged) : 'No charge'}</Row>
        {row.failure_reason && <Row label="Reason">{row.failure_reason}</Row>}
        <Row label="Date">{new Date(row.created_at).toLocaleString('en-IN', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })}</Row>
      </dl>
      {row.receipt_url && (
        <div className="mt-5">
          <DownloadButton url={row.receipt_url} filename={row.receipt_filename ?? 'receipt.pdf'} label="Receipt (PDF)" />
        </div>
      )}
    </Modal>
  )
}

const Stat = ({ label, value }) => (
  <div className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 dark:border-slate-800 dark:bg-slate-800/40">
    <div className="text-xs font-medium text-slate-500 dark:text-slate-400">{label}</div>
    <div className="mt-1 text-lg font-bold text-slate-900 dark:text-white">{value}</div>
  </div>
)

/**
 * Layout shared by every service page.
 *   children  = the form (left card)
 *   result    = the result panel on the right (null shows the empty "Verification result" box)
 *   hideResult = e-Sign shows its own result inside the form, so the empty box is not drawn
 */
export default function ServiceShell({ info, balance, recent, title, subtitle, docLabel = 'Document', note, result, resultHint, hideResult = false, children }) {
  const meta = metaFor(info.code)
  const Icon = meta.icon
  const [viewing, setViewing] = useState(null)

  return (
    <div className="space-y-6">
      <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-end">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-white">{title}</h1>
          <p className="text-sm text-slate-500 dark:text-slate-400">{subtitle}</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Link to={`/retailer/history?service=${info.code}`} className={`${ghostBtn} inline-flex items-center gap-2 !py-2.5`}>
            <HistoryIcon className="h-4 w-4" /> {meta.short} history
          </Link>
          <Link to="/retailer/kyc" className="inline-flex items-center gap-2 rounded-xl bg-brand-50 px-4 py-2.5 text-sm font-semibold text-brand-700 hover:bg-brand-100 dark:bg-brand-950 dark:text-brand-300">
            <ListChecks className="h-4 w-4" /> Complete KYC
          </Link>
        </div>
      </div>

      <div className="grid items-start gap-6 lg:grid-cols-2">
        {/* Left: the form */}
        <Card className="!p-0">
          <div className="flex items-center gap-3 border-b border-slate-100 p-5 dark:border-slate-800">
            <span className={`flex h-11 w-11 items-center justify-center rounded-xl ${meta.tone}`}>
              <Icon className="h-5 w-5" />
            </span>
            <div>
              <div className="font-semibold text-slate-900 dark:text-white">{info.name}</div>
              <div className="text-xs text-slate-500 dark:text-slate-400">
                {info.dev_mode ? 'Test mode · mock responses only' : 'Customer consent required'}
              </div>
            </div>
          </div>

          <div className="space-y-5 p-5">
            <div className="grid grid-cols-3 gap-3">
              <Stat label="Charge per request" value={formatINR(info.price)} />
              <Stat label="Wallet balance" value={formatINR(balance)} />
              <Stat label="Today" value={`${info.today_count} ${info.today_count === 1 ? 'check' : 'checks'}`} />
            </div>

            {children}

            {note && (
              <div className="flex gap-2 rounded-xl bg-sky-50 px-4 py-3 text-xs leading-relaxed text-sky-900 dark:bg-sky-950 dark:text-sky-200">
                <Lock className="mt-0.5 h-3.5 w-3.5 shrink-0" />
                <div>{note}</div>
              </div>
            )}
          </div>
        </Card>

        {/* Right: result and recent checks */}
        <div className="space-y-6">
          {!hideResult && (
            <Card>
              {result ?? (
                <div className="flex flex-col items-center py-10 text-center">
                  <span className="flex h-24 w-24 items-center justify-center rounded-full border border-dashed border-slate-300 bg-slate-50 dark:border-slate-700 dark:bg-slate-800/40">
                    <Icon className="h-9 w-9 text-slate-400" />
                  </span>
                  <div className="mt-4 font-semibold text-slate-900 dark:text-white">Verification result</div>
                  <p className="mt-1 max-w-xs text-sm text-slate-500 dark:text-slate-400">{resultHint ?? 'Submit the details. The response will appear here.'}</p>
                </div>
              )}
            </Card>
          )}

          <Card
            title={`Recent ${meta.short} checks`}
            action={<Link to={`/retailer/history?service=${info.code}`} className="text-xs font-semibold text-brand-700 hover:underline dark:text-brand-300">View all</Link>}
          >
            <div className="overflow-x-auto">
              <table className="w-full min-w-[460px] text-left text-sm">
                <thead>
                  <tr className="border-b border-slate-100 text-xs uppercase tracking-wide text-slate-400 dark:border-slate-800">
                    <th className="pb-2 font-semibold">Request</th>
                    <th className="pb-2 font-semibold">{docLabel}</th>
                    <th className="pb-2 font-semibold">Status</th>
                    <th className="pb-2 text-right font-semibold">Charged</th>
                    <th className="pb-2" />
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                  {recent.length === 0 && (
                    <tr><td colSpan="5" className="py-8 text-center text-slate-400">No checks yet.</td></tr>
                  )}
                  {recent.map((r) => (
                    <tr key={r.id} className="text-slate-700 dark:text-slate-200">
                      <td className="py-3">
                        <div className="font-mono text-xs font-semibold">{refNo(r.id)}</div>
                        <div className="text-xs text-slate-400">{timeAgo(r.created_at)}</div>
                      </td>
                      <td className="py-3 font-mono text-xs">{r.input_masked}</td>
                      <td className="py-3"><StatusBadge status={r.status} /></td>
                      <td className="py-3 text-right">{r.charged > 0 ? formatINR(r.charged) : '-'}</td>
                      <td className="py-3 text-right">
                        <button onClick={() => setViewing(r)} aria-label="View details" className="rounded-lg p-1.5 text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800">
                          <Eye className="h-4 w-4" />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Card>
        </div>
      </div>

      {viewing && <DetailsModal row={viewing} onClose={() => setViewing(null)} />}
    </div>
  )
}
