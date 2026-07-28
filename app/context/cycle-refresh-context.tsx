import React, { createContext, useCallback, useContext, useMemo, useState } from 'react'

interface CycleRefreshContextValue {
  refreshKey: number
  bumpCycleRefresh: () => void
}

const CycleRefreshContext = createContext<CycleRefreshContextValue | null>(null)

export function CycleRefreshProvider({ children }: { children: React.ReactNode }) {
  const [refreshKey, setRefreshKey] = useState(0)
  const bumpCycleRefresh = useCallback(() => {
    setRefreshKey((k) => k + 1)
  }, [])

  const value = useMemo(
    () => ({
      refreshKey,
      bumpCycleRefresh,
    }),
    [refreshKey, bumpCycleRefresh],
  )

  return <CycleRefreshContext.Provider value={value}>{children}</CycleRefreshContext.Provider>
}

export function useCycleRefresh(): CycleRefreshContextValue {
  const ctx = useContext(CycleRefreshContext)
  if (!ctx) throw new Error('useCycleRefresh must be used within CycleRefreshProvider')
  return ctx
}
