import { useState } from 'react'
import { Download, Loader2 } from 'lucide-react'
import { downloadFile } from '../../utils/downloadFile'

/**
 * Downloads a file from the API with the login token (works for CSV and PDF).
 *
 *   <DownloadButton url="/retailer/kyc/5/report" filename="kyc-report.pdf" label="KYC report (PDF)" onError={(msg) => ...} />
 *   compact : small button for table rows
 */
export default function DownloadButton({ url, params, filename, label = 'Download CSV', compact = false, onError }) {
  const [busy, setBusy] = useState(false)

  const click = async () => {
    if (busy) return // block double clicks
    setBusy(true)
    try {
      await downloadFile(url, params, filename)
    } catch (err) {
      onError?.(err.message)
    } finally {
      setBusy(false)
    }
  }

  const size = compact ? 'gap-1.5 rounded-lg px-2.5 py-1.5 text-xs' : 'gap-2 rounded-xl px-4 py-2.5 text-sm'

  return (
    <button
      type="button"
      onClick={click}
      disabled={busy}
      className={`inline-flex items-center justify-center border border-slate-300 bg-white font-semibold text-slate-700 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-60 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200 dark:hover:bg-slate-800 ${size}`}
    >
      {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Download className="h-4 w-4" />}
      {label}
    </button>
  )
}
