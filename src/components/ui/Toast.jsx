import { useEffect } from 'react'
import { CheckCircle2, AlertCircle } from 'lucide-react'

// toast = { type: 'success' | 'error', text: '...' } or null
export default function Toast({ toast, onClose }) {
  useEffect(() => {
    if (!toast) return
    const timer = setTimeout(onClose, 3500)
    return () => clearTimeout(timer)
  }, [toast, onClose])

  if (!toast) return null

  const isError = toast.type === 'error'

  return (
    <div
      role="status"
      className={`fixed right-4 top-20 z-[60] flex max-w-sm items-center gap-2 rounded-xl border px-4 py-3 text-sm shadow-lg ${
        isError
          ? 'border-red-200 bg-red-50 text-red-700 dark:border-red-800 dark:bg-red-950 dark:text-red-300'
          : 'border-brand-200 bg-brand-50 text-brand-800 dark:border-brand-800 dark:bg-brand-950 dark:text-brand-200'
      }`}
    >
      {isError ? <AlertCircle className="h-4 w-4 shrink-0" /> : <CheckCircle2 className="h-4 w-4 shrink-0" />}
      {toast.text}
    </div>
  )
}