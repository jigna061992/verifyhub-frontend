import { useCallback, useEffect, useRef, useState } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import { Bell, CheckCheck } from 'lucide-react'
import api from '../api/axios'
import { timeAgo } from '../pages/retailer/services/helpers'
import { notificationMeta } from '../utils/notificationMeta'

export default function NotificationBell() {
  const navigate = useNavigate()
  const location = useLocation()
  const box = useRef(null)

  const [open, setOpen] = useState(false)
  const [count, setCount] = useState(0)
  const [items, setItems] = useState([])
  const [loading, setLoading] = useState(false)

  const loadCount = useCallback(() => {
    api.get('/notifications/unread-count').then((res) => setCount(res.data.count)).catch(() => {})
  }, [])

  const loadList = useCallback(() => {
    setLoading(true)
    api
      .get('/notifications', { params: { per_page: 8 } })
      .then((res) => {
        setItems(res.data.data)
        setCount(res.data.unread_count)
      })
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [])

  // Count: when the page changes (a verification may just have caused a low balance alert),
  // every minute, when the tab becomes active again, and when another screen asks for a refresh
  useEffect(() => {
    loadCount()
  }, [location.pathname, loadCount])

  useEffect(() => {
    const timer = setInterval(loadCount, 60000)
    const onVisible = () => document.visibilityState === 'visible' && loadCount()

    document.addEventListener('visibilitychange', onVisible)
    window.addEventListener('notifications:refresh', loadCount)

    return () => {
      clearInterval(timer)
      document.removeEventListener('visibilitychange', onVisible)
      window.removeEventListener('notifications:refresh', loadCount)
    }
  }, [loadCount])

  // List: load when the panel opens
  useEffect(() => {
    if (open) loadList()
  }, [open, loadList])

  // Close on outside click or Esc
  useEffect(() => {
    if (!open) return undefined
    const onClick = (e) => box.current && !box.current.contains(e.target) && setOpen(false)
    const onKey = (e) => e.key === 'Escape' && setOpen(false)

    document.addEventListener('mousedown', onClick)
    document.addEventListener('keydown', onKey)
    return () => {
      document.removeEventListener('mousedown', onClick)
      document.removeEventListener('keydown', onKey)
    }
  }, [open])

  const openItem = (n) => {
    if (!n.read_at) {
      // Update the screen first, then tell the server. If the server fails, reload the real state.
      setItems((list) => list.map((i) => (i.id === n.id ? { ...i, read_at: new Date().toISOString() } : i)))
      setCount((c) => Math.max(0, c - 1))
      api.post(`/notifications/${n.id}/read`).catch(loadList)
    }
    setOpen(false)
    if (n.link) navigate(n.link)
  }

  const markAll = () => {
    api
      .post('/notifications/read-all')
      .then(() => {
        setItems((list) => list.map((i) => ({ ...i, read_at: i.read_at ?? new Date().toISOString() })))
        setCount(0)
      })
      .catch(() => {})
  }

  return (
    <div className="relative" ref={box}>
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-label={count > 0 ? `Notifications, ${count} unread` : 'Notifications'}
        aria-expanded={open}
        className="relative rounded-lg p-2 text-slate-500 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800"
      >
        <Bell className="h-5 w-5" />
        {count > 0 && (
          <span className="absolute -right-0.5 -top-0.5 flex h-[18px] min-w-[18px] items-center justify-center rounded-full bg-red-500 px-1 text-[10px] font-bold leading-none text-white">
            {count > 99 ? '99+' : count}
          </span>
        )}
      </button>

      {open && (
        <div className="absolute right-0 top-full z-50 mt-2 w-96 max-w-[calc(100vw-2rem)] overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-xl dark:border-slate-700 dark:bg-slate-900">
          <div className="flex items-center justify-between border-b border-slate-100 px-4 py-3 dark:border-slate-800">
            <h3 className="text-sm font-semibold text-slate-900 dark:text-white">Notifications</h3>
            <button
              type="button"
              onClick={markAll}
              disabled={count === 0}
              className="flex items-center gap-1 text-xs font-semibold text-brand-700 hover:underline disabled:cursor-not-allowed disabled:opacity-40 dark:text-brand-300"
            >
              <CheckCheck className="h-3.5 w-3.5" /> Mark all as read
            </button>
          </div>

          <div className="max-h-96 overflow-y-auto">
            {loading && items.length === 0 && (
              <p className="px-4 py-8 text-center text-sm text-slate-500 dark:text-slate-400">Loading...</p>
            )}

            {!loading && items.length === 0 && (
              <p className="px-4 py-8 text-center text-sm text-slate-500 dark:text-slate-400">No notifications yet.</p>
            )}

            {items.map((n) => {
              const { icon: Icon, style } = notificationMeta(n.type)
              return (
                <button
                  key={n.id}
                  type="button"
                  onClick={() => openItem(n)}
                  className={`flex w-full items-start gap-3 px-4 py-3 text-left hover:bg-slate-50 dark:hover:bg-slate-800 ${
                    n.read_at ? '' : 'bg-brand-50/60 dark:bg-brand-950/40'
                  }`}
                >
                  <span className={`mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-full ${style}`}>
                    <Icon className="h-4 w-4" />
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="flex items-center gap-2">
                      <span className="truncate text-sm font-semibold text-slate-900 dark:text-white">{n.title}</span>
                      {!n.read_at && <span className="h-2 w-2 shrink-0 rounded-full bg-brand-500" aria-label="Unread" />}
                    </span>
                    <span className="mt-0.5 line-clamp-2 block text-xs text-slate-600 dark:text-slate-300">{n.message}</span>
                    <span className="mt-1 block text-[11px] text-slate-400">{timeAgo(n.created_at)}</span>
                  </span>
                </button>
              )
            })}
          </div>

          <Link
            to="/retailer/notifications"
            onClick={() => setOpen(false)}
            className="block border-t border-slate-100 px-4 py-3 text-center text-sm font-semibold text-brand-700 hover:bg-slate-50 dark:border-slate-800 dark:text-brand-300 dark:hover:bg-slate-800"
          >
            View all notifications
          </Link>
        </div>
      )}
    </div>
  )
}
