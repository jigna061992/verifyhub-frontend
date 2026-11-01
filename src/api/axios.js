import axios from 'axios'
import { getToken, clearToken } from '../utils/tokenStorage'

const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL,
  headers: { Accept: 'application/json' },
})

// Attach the token to every request
api.interceptors.request.use((config) => {
  const token = getToken()
  if (token) config.headers.Authorization = `Bearer ${token}`
  return config
})

// Expired or invalid token: clear it and go to the login page
api.interceptors.response.use(
  (res) => res,
  (err) => {
    const isLoginRequest = err.config?.url?.includes('/login')
    if (err.response?.status === 401 && !isLoginRequest) {
      clearToken()
      window.location.href = '/login'
    }
    return Promise.reject(err)
  }
)

export default api