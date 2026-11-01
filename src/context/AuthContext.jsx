import { createContext, useContext, useEffect, useState } from 'react'
import api from '../api/axios'
import { getToken, saveToken, clearToken } from '../utils/tokenStorage'

const AuthContext = createContext(null)

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null)
  const [loading, setLoading] = useState(true)

  // Restore the user from the saved token on page refresh
  useEffect(() => {
    if (!getToken()) {
      setLoading(false)
      return
    }
    api.get('/user')
      .then((res) => setUser(res.data))
      .catch(() => clearToken())
      .finally(() => setLoading(false))
  }, [])

  const login = async ({ login, password, role, remember }) => {
    const res = await api.post('/login', { login, password, role, remember })
    saveToken(res.data.token, remember)
    setUser(res.data.user)
    return res.data.user
  }

  const logout = async () => {
    try {
      await api.post('/logout')
    } finally {
      clearToken()
      // Login page shows the "signed out securely" message once
      sessionStorage.setItem('signed_out', '1')
      setUser(null)
    }
  }

  return (
    <AuthContext.Provider value={{ user, loading, login, logout }}>
      {children}
    </AuthContext.Provider>
  )
}

export const useAuth = () => useContext(AuthContext)