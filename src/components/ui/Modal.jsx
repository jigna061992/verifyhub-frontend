import { useEffect } from 'react'
import { X } from 'lucide-react'

/**
 * Props:
 *  title, onClose, children      : as before (other screens keep working unchanged)
 *  subtitle                      : small grey text under the title
 *  icon                          : lucide icon shown in a tile before the title
 *  size                          : 'lg' (default) or '2xl' for wide forms
 *  footer                        : buttons kept fixed at the bottom while the form body scrolls
 */
export default function Modal({ title, subtitle, icon: Icon, size = 'lg', footer, onClose, children }) {
  // Close on Escape key
  useEffect(() => {
    const onKey = (e) => e.key === 'Escape' && onClose()
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onClose])

  const width = size === '2xl' ? 'max-w-2xl' : 'max-w-lg'

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/50" onClick={onClose} />

      <div
        role="dialog"
        aria-modal="true"
        aria-label={title}
        className={`relative flex max-h-[90vh] w-full ${width} flex-col overflow-hidden rounded-2xl bg-white shadow-xl dark:bg-slate-900`}
      >
        <div className="flex items-start gap-3 border-b border-slate-100 px-6 py-4 dark:border-slate-800">
          {Icon && (
            <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-brand-50 text-brand-700 dark:bg-brand-950 dark:text-brand-300">
              <Icon className="h-5 w-5" />
            </span>
          )}

          <div className="min-w-0 flex-1">
            <h3 className="text-lg font-bold text-slate-900 dark:text-white">{title}</h3>
            {subtitle && <p className="text-sm text-slate-500 dark:text-slate-400">{subtitle}</p>}
          </div>

          <button
            onClick={onClose}
            aria-label="Close"
            className="rounded-lg p-1.5 text-slate-500 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto px-6 py-5">{children}</div>

        {footer && (
          <div className="flex justify-end gap-3 border-t border-slate-100 bg-slate-50 px-6 py-4 dark:border-slate-800 dark:bg-slate-900">
            {footer}
          </div>
        )}
      </div>
    </div>
  )
}
