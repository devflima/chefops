'use client'

import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { useEffect, useState } from 'react'
import { registerServiceWorker } from './registerSW'

export default function Providers({ children }: { children: React.ReactNode }) {
  const [queryClient] = useState(() => new QueryClient({
    defaultOptions: {
      queries: {
        staleTime: 1000 * 30,
        retry: 1,
      },
    },
  }))

  useEffect(() => {
    registerServiceWorker()
  }, [])

  return (
    <QueryClientProvider client={queryClient}>
      {children}
    </QueryClientProvider>
  )
}