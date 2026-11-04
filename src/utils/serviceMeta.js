import { Fingerprint, CreditCard, Landmark, FileSignature, ShieldCheck, ListChecks } from 'lucide-react'

// Complete KYC price = the sum of these 4 services (calculated by the server, never typed by hand)
export const BUNDLE_PARTS = ['AADHAAR', 'PAN', 'BANK', 'ESIGN']

// Icon, colour and short name of each service (matched by service code)
export const SERVICE_META = {
  AADHAAR: {
    icon: Fingerprint,
    short: 'Aadhaar',
    tone: 'bg-violet-50 text-violet-600 dark:bg-violet-950 dark:text-violet-300',
  },
  PAN: {
    icon: CreditCard,
    short: 'PAN',
    tone: 'bg-blue-50 text-blue-600 dark:bg-blue-950 dark:text-blue-300',
  },
  BANK: {
    icon: Landmark,
    short: 'Bank',
    tone: 'bg-sky-50 text-sky-600 dark:bg-sky-950 dark:text-sky-300',
  },
  ESIGN: {
    icon: FileSignature,
    short: 'e-Sign',
    tone: 'bg-emerald-50 text-emerald-600 dark:bg-emerald-950 dark:text-emerald-300',
  },
  COMPLETE_KYC: {
    icon: ListChecks,
    short: 'Complete KYC',
    tone: 'bg-indigo-50 text-indigo-600 dark:bg-indigo-950 dark:text-indigo-300',
  },
  KYC_BUNDLE: {
    icon: ListChecks,
    short: 'Complete KYC',
    tone: 'bg-indigo-50 text-indigo-600 dark:bg-indigo-950 dark:text-indigo-300',
  },
}

export const metaFor = (code) =>
  SERVICE_META[code] || {
    icon: ShieldCheck,
    short: code,
    tone: 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300',
  }
