import { useCallback, useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { CheckCheck } from 'lucide-react'
import api from '../../api/axios'
import Card from '../../components/ui/Card'
import Pagination from '../../components/ui/Pagination'
import { getErrorMessage } from '../../utils/errors'
import { notificationMeta, refreshNotifications } from '../../utils/notificationMeta'
import { timeAgo } from './services/helpers'

export default function Notifications() {
  const navigate = useNavigate()

  const [rows, setRows] = useState([])
  const [meta, setMeta] = useState(null)
  const [unread, setUnread] = useState(0)
  const [onlyUnread, setOnlyUnread] = useState(false)
  const [page, setPage] = useState(1)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  const load = useCallback(() => {
    setLoading(true)
    setError('')
    api
      .get('/notifications', { params: { page, per_page: 15, unread: onlyUnread ? 1 : 0 } })
      .then((res) => {
        const { data, unread_count, ...pagination } = res.data
        setRows(data)
        setMeta(pagination)
        setUnread(unread_count)
      })
      .catch((err) => setError(getErrorMessage(err, 'Unable to load notifications.')))
      .finally(() => setLoading(false))
  }, [page, onlyUnread])

  useEffect(() => {
    load()
  }, [load])

  const openItem = async (n) => {
    if (!n.read_at) {
      try {
        await api.post(`/notifications/${n.id}/read`)
        refreshNotifications()
      } catch {
        /* the next reload shows the real state */
      }
    }
    if (n.link) navigate(n.link)
    else load()
  }

  const markAll = async () => {
    try {
      await api.post('/notifications/read-all')
      refreshNotifications()
      load()
    } catch (err) {
      setError(getErrorMessage(err))
    }
  }

  const tab = (active) =>
    `rounded-lg px-4 py-2 text-sm font-semibold transition ${
      active
        ? 'bg-brand-700 text-white'
        : 'text-slate-600 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800'
    }`

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-900 dark:text-white">Notifications</h1>
        <p className="text-sm text-slate-500 dark:text-slate-400">Top-up decisions, wallet changes and low balance alerts.</p>
      </div>

      <Card>
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
          <div className="flex gap-1">
            <button
              type="button"
              className={tab(!onlyUnread)}
              onClick={() => {
                setOnlyUnread(false)
                setPage(1)
              }}
            >
              All
            </button>
            <button
              type="button"
              className={tab(onlyUnread)}
              onClick={() => {
                setOnlyUnread(true)
                setPage(1)
              }}
            >
              Unread{unread > 0 ? ` (${unread})` : ''}
            </button>
          </div>

          <button
            type="button"
            onClick={markAll}
            disabled={unread === 0}
            className="flex items-center gap-1.5 rounded-lg border border-slate-300 px-3 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50 dark:border-slate-700 dark:text-slate-200 dark:hover:bg-slate-800"
          >
            <CheckCheck className="h-4 w-4" /> Mark all as read
          </button>
        </div>

        {error && (
          <div className="mb-4 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700 dark:border-red-800 dark:bg-red-950 dark:text-red-300">
            {error}
          </div>
        )}

        {loading && rows.length === 0 ? (
          <p className="py-10 text-center text-sm text-slate-500 dark:text-slate-400">Loading...</p>
        ) : rows.length === 0 ? (
          <p className="py-10 text-center text-sm text-slate-500 dark:text-slate-400">
            {onlyUnread ? 'No unread notifications.' : 'No notifications yet.'}
          </p>
        ) : (
          <ul className="divide-y divide-slate-100 dark:divide-slate-800">
            {rows.map((n) => {
              const { icon: Icon, style } = notificationMeta(n.type)
              return (
                <li key={n.id}>
                  <button
                    type="button"
                    onClick={() => openItem(n)}
                    className="flex w-full items-start gap-3 px-1 py-4 text-left hover:bg-slate-50 dark:hover:bg-slate-800/60"
                  >
                    <span className={`mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-full ${style}`}>
                      <Icon className="h-4 w-4" />
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="flex items-center gap-2">
                        <span className="text-sm font-semibold text-slate-900 dark:text-white">{n.title}</span>
                        {!n.read_at && <span className="h-2 w-2 rounded-full bg-brand-500" aria-label="Unread" />}
                      </span>
                      <span className="mt-0.5 block text-sm text-slate-600 dark:text-slate-300">{n.message}</span>
                    </span>
                    <span className="shrink-0 text-xs text-slate-400">{timeAgo(n.created_at)}</span>
                  </button>
                </li>
              )
            })}
          </ul>
        )}

        <Pagination meta={meta} onPage={setPage} />
      </Card>
    </div>
  )
}
