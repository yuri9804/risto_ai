import { createContext, useContext, useState, useEffect, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { authApi } from '../services/api'

const AuthContext = createContext(null)

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const navigate = useNavigate()

  // Check for existing auth on mount
  useEffect(() => {
    const token = localStorage.getItem('auth_token')
    const savedUser = localStorage.getItem('auth_user')

    if (token && savedUser) {
      try {
        setUser(JSON.parse(savedUser))
      } catch (e) {
        localStorage.removeItem('auth_token')
        localStorage.removeItem('auth_user')
      }
    }
    setLoading(false)
  }, [])

  const login = useCallback(async (email, password) => {
    setError(null)
    setLoading(true)

    try {
      const response = await authApi.login(email, password)
      localStorage.setItem('auth_token', response.access_token)
      localStorage.setItem('auth_user', JSON.stringify(response.user))
      setUser(response.user)
      navigate('/app')
      return response
    } catch (err) {
      setError(err.message || 'Errore durante il login')
      throw err
    } finally {
      setLoading(false)
    }
  }, [navigate])

  const register = useCallback(async (data) => {
    setError(null)
    setLoading(true)

    try {
      const response = await authApi.register(data)
      localStorage.setItem('auth_token', response.access_token)
      localStorage.setItem('auth_user', JSON.stringify(response.user))
      setUser(response.user)
      navigate('/app')
      return response
    } catch (err) {
      setError(err.message || 'Errore durante la registrazione')
      throw err
    } finally {
      setLoading(false)
    }
  }, [navigate])

  const logout = useCallback(async () => {
    try {
      await authApi.logout()
    } catch (err) {
      // Ignore logout errors
    } finally {
      localStorage.removeItem('auth_token')
      localStorage.removeItem('auth_user')
      setUser(null)
      navigate('/login')
    }
  }, [navigate])

  const refreshUser = useCallback(async () => {
    try {
      const userData = await authApi.getProfile()
      localStorage.setItem('auth_user', JSON.stringify(userData))
      setUser(userData)
      return userData
    } catch (err) {
      // If refresh fails, logout
      logout()
      throw err
    }
  }, [logout])

  const value = {
    user,
    loading,
    error,
    isAuthenticated: !!user,
    login,
    register,
    logout,
    refreshUser,
    setError,
  }

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const context = useContext(AuthContext)
  if (!context) {
    throw new Error('useAuth deve essere usato dentro un AuthProvider')
  }
  return context
}

export default AuthContext
