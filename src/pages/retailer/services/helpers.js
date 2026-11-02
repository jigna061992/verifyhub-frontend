// Request number shown to the retailer (the real id is a number in the database)
export const refNo = (id) => `VRF-${String(id).padStart(6, '0')}`

export const timeAgo = (iso) => {
  const min = Math.max(0, Math.floor((Date.now() - new Date(iso).getTime()) / 60000))
  if (min < 1) return 'just now'
  if (min < 60) return `${min} min ago`
  if (min < 60 * 24) return `${Math.floor(min / 60)} hr ago`
  return new Date(iso).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })
}

// Service code -> page of that service
export const SERVICE_PATH = {
  AADHAAR: '/retailer/verify/aadhaar',
  PAN: '/retailer/verify/pan',
  BANK: '/retailer/verify/bank',
  GST: '/retailer/verify/gst',
  ESIGN: '/retailer/verify/esign',
}

export const primaryBtn =
  'inline-flex items-center justify-center gap-2 rounded-xl bg-brand-700 px-5 py-2.5 text-sm font-semibold text-white hover:bg-brand-800 disabled:cursor-not-allowed disabled:opacity-50'
export const ghostBtn =
  'rounded-xl border border-slate-300 px-5 py-2.5 text-sm font-semibold text-slate-700 hover:bg-slate-50 disabled:opacity-50 dark:border-slate-700 dark:text-slate-200 dark:hover:bg-slate-800'
export const chipBtn =
  'rounded-full border border-slate-300 px-3 py-1 text-xs font-medium text-slate-600 hover:bg-slate-50 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800'
