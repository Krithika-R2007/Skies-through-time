import { createContext, useContext, useMemo } from 'react'
import type { ReactNode } from 'react'
import type { AstronomyDataProvider } from './AstronomyDataProvider'
import { LiveAstronomyProvider } from './LiveAstronomyProvider'

const DataContext = createContext<AstronomyDataProvider | null>(null)

export function DataProvider({ children }: { children: ReactNode }) {
  const provider = useMemo(() => new LiveAstronomyProvider(), [])
  return <DataContext.Provider value={provider}>{children}</DataContext.Provider>
}

export function useDataProvider(): AstronomyDataProvider {
  const provider = useContext(DataContext)
  if (!provider) {
    throw new Error('useDataProvider must be used within a DataProvider')
  }
  return provider
}
