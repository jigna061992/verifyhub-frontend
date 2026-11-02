import { CheckCircle2, XCircle, AlertTriangle, Wallet, Bell, Scale } from 'lucide-react'

// Icon + colors for each notification type (same names as the backend "type" column)
const GREEN = 'bg-emerald-50 text-emerald-600 dark:bg-emerald-950 dark:text-emerald-300'
const RED = 'bg-red-50 text-red-600 dark:bg-red-950 dark:text-red-300'
const AMBER = 'bg-amber-50 text-amber-600 dark:bg-amber-950 dark:text-amber-300'
const GREY = 'bg-slate-100 text-slate-500 dark:bg-slate-800 dark:text-slate-300'

const META = {
  topup_approved: { icon: CheckCircle2, style: GREEN },
  topup_rejected: { icon: XCircle, style: RED },
  low_balance: { icon: AlertTriangle, style: AMBER },
  wallet_credited: { icon: Wallet, style: GREEN },
  wallet_debited: { icon: Wallet, style: AMBER },
  verification_resolved: { icon: Scale, style: GREEN },
}

export const notificationMeta = (type) => META[type] ?? { icon: Bell, style: GREY }

// Tell the bell to reload its count (call after you mark something as read)
export const refreshNotifications = () => window.dispatchEvent(new Event('notifications:refresh'))
