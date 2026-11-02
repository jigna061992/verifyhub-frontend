import { useCallback, useEffect, useState } from 'react'
import api from '../../../api/axios'

/**
 * Everything one service page needs:
 *  info   : GET /retailer/services/{code}  (price, wallet, today count, consent text, purposes, test samples)
 *  recent : the last 5 checks of this service (same data as the History screen)
 *  state  : 'loading' | 'ready' | 'unavailable' (service is off for this retailer) | 'error'
 */
export default function useService(code) {
  const [info, setInfo] = useState(null)
  const [recent, setRecent] = useState([])
  const [state, setState] = useState('loading')

  const load = useCallback(() => {
    api
      .get(`/retailer/services/${code}`)
      .then((res) => {
        setInfo(res.data)
        setState('ready')
      })
      .catch((err) => setState(err?.response?.status === 404 ? 'unavailable' : 'error'))

    api
      .get('/retailer/history', { params: { service: code, per_page: 5 } })
      .then((res) => setRecent(res.data.data ?? []))
      .catch(() => {})
  }, [code])

  useEffect(() => {
    setState('loading')
    load()
  }, [load])

  return { info, recent, state, reload: load }
}
