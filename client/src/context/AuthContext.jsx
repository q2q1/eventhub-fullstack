import { useEffect, useMemo, useState } from 'react'
import api from '../api/client'
import { AuthContext } from './authContext'

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null)
  const [token, setToken] = useState(() => localStorage.getItem('eventhub_token'))
  const [loading, setLoading] = useState(Boolean(token))

  useEffect(() => {
    async function fetchMe() {
      if (!token) {
        setLoading(false)
        return
      }

      try {
        const { data } = await api.get('/auth/me')
        setUser(data.user)
      } catch {
        localStorage.removeItem('eventhub_token')
        setToken(null)
      } finally {
        setLoading(false)
      }
    }

    fetchMe()
  }, [token])

  async function login(email, password) {
    const { data } = await api.post('/auth/login', { email, password })
    localStorage.setItem('eventhub_token', data.token)
    setToken(data.token)
    setUser(data.user)
  }

  async function signup(name, email, password) {
    const { data } = await api.post('/auth/signup', { name, email, password })
    localStorage.setItem('eventhub_token', data.token)
    setToken(data.token)
    setUser(data.user)
  }

  function logout() {
    localStorage.removeItem('eventhub_token')
    setToken(null)
    setUser(null)
  }

  const value = useMemo(
    () => ({ user, token, loading, login, signup, logout }),
    [user, token, loading],
  )

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}
