import { create } from 'zustand'
import type { ProviderConfig } from '@/api/types'

interface ProviderState {
  providers: ProviderConfig[]
  selectedProviderId: string | null
  isLoading: boolean

  setProviders: (providers: ProviderConfig[]) => void
  addProvider: (provider: ProviderConfig) => void
  updateProvider: (id: string, updates: Partial<ProviderConfig>) => void
  removeProvider: (id: string) => void
  selectProvider: (id: string | null) => void
  setLoading: (loading: boolean) => void
}

export const useProviderStore = create<ProviderState>((set) => ({
  providers: [],
  selectedProviderId: null,
  isLoading: false,

  setProviders: (providers) => set({ providers }),

  addProvider: (provider) =>
    set((state) => ({ providers: [...state.providers, provider] })),

  updateProvider: (id, updates) =>
    set((state) => ({
      providers: state.providers.map((p) =>
        p.id === id ? { ...p, ...updates } : p
      ),
    })),

  removeProvider: (id) =>
    set((state) => ({
      providers: state.providers.filter((p) => p.id !== id),
      selectedProviderId:
        state.selectedProviderId === id ? null : state.selectedProviderId,
    })),

  selectProvider: (id) => set({ selectedProviderId: id }),

  setLoading: (isLoading) => set({ isLoading }),
}))
