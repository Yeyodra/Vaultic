import { useCallback, useState } from 'react'
import { useProviderStore } from '@/stores/providerStore'
import * as authApi from '@/api/auth'
import type { ProviderConfig } from '@/api/types'

export function useProviders() {
  const {
    providers,
    selectedProviderId,
    isLoading,
    setProviders,
    addProvider: addToStore,
    updateProvider: updateInStore,
    removeProvider: removeFromStore,
    selectProvider,
    setLoading,
  } = useProviderStore()

  const [error, setError] = useState<string | null>(null)

  const fetchProviders = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const data = await authApi.getProviders()
      setProviders(data)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch providers')
    } finally {
      setLoading(false)
    }
  }, [setProviders, setLoading])

  const addProvider = useCallback(
    async (provider: Pick<ProviderConfig, 'name' | 'workerUrl' | 'authToken'>) => {
      setError(null)
      try {
        const newProvider = await authApi.addProvider(provider)
        addToStore(newProvider)
        return newProvider
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to add provider')
        throw err
      }
    },
    [addToStore]
  )

  const updateProvider = useCallback(
    async (id: string, updates: Partial<ProviderConfig>) => {
      setError(null)
      try {
        const updated = await authApi.updateProvider(id, updates)
        updateInStore(id, updated)
        return updated
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to update provider')
        throw err
      }
    },
    [updateInStore]
  )

  const removeProvider = useCallback(
    async (id: string) => {
      setError(null)
      try {
        await authApi.deleteProvider(id)
        removeFromStore(id)
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to remove provider')
        throw err
      }
    },
    [removeFromStore]
  )

  const testConnection = useCallback(async (id: string) => {
    return authApi.testProviderConnection(id)
  }, [])

  const selectedProvider = providers.find((p) => p.id === selectedProviderId)

  return {
    providers,
    selectedProvider,
    selectedProviderId,
    isLoading,
    error,
    fetchProviders,
    addProvider,
    updateProvider,
    removeProvider,
    selectProvider,
    testConnection,
  }
}
