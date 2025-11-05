import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { type ReactNode, useEffect } from 'react'
import { initializeAssets } from '@/utils/assetManager'

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 1000 * 60 * 5, // 5 minutes
      gcTime: 1000 * 60 * 10, // 10 minutes
      retry: 3,
      refetchOnWindowFocus: false,
    },
  },
})

interface QueryProviderProps {
  children: ReactNode
}

export function QueryProvider({ children }: QueryProviderProps) {
  useEffect(() => {
    // Initialize the asset manager when the app starts
    initializeAssets({
      preloadStrategy: 'high',
      enableCaching: true
    }).catch((error) => {
      console.error('Failed to initialize asset manager:', error)
    })
  }, [])

  return (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  )
}