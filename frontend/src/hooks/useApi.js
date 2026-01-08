import { useState, useEffect, useCallback } from 'react'

/**
 * Custom hook for API calls with loading and error states
 */
export function useApi(apiCall, dependencies = [], options = {}) {
  const { immediate = true, initialData = null } = options
  const [data, setData] = useState(initialData)
  const [loading, setLoading] = useState(immediate)
  const [error, setError] = useState(null)

  const execute = useCallback(async (...args) => {
    setLoading(true)
    setError(null)
    try {
      const result = await apiCall(...args)
      setData(result)
      return result
    } catch (err) {
      setError(err.message || 'An error occurred')
      throw err
    } finally {
      setLoading(false)
    }
  }, [apiCall])

  useEffect(() => {
    if (immediate) {
      execute().catch(() => {})
    }
  }, dependencies)

  const refetch = useCallback(() => {
    return execute()
  }, [execute])

  return { data, loading, error, refetch, execute, setData }
}

/**
 * Custom hook for API mutations (POST, PUT, DELETE)
 */
export function useMutation(apiCall) {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)
  const [data, setData] = useState(null)

  const mutate = useCallback(async (...args) => {
    setLoading(true)
    setError(null)
    try {
      const result = await apiCall(...args)
      setData(result)
      return result
    } catch (err) {
      setError(err.message || 'An error occurred')
      throw err
    } finally {
      setLoading(false)
    }
  }, [apiCall])

  const reset = useCallback(() => {
    setLoading(false)
    setError(null)
    setData(null)
  }, [])

  return { mutate, loading, error, data, reset }
}

export default useApi
