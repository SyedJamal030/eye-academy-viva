import type { ReactNode } from 'react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'

export function getContext() {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: {
        staleTime: 1000 * 60,
        retry: 1,
      },
    },
  })

  return {
    queryClient,
  }
}

export function Provider({ children }: { children: ReactNode }) {
  const client = getContext().queryClient
  return <QueryClientProvider client={client}>{children}</QueryClientProvider>
}

export const TanStackQueryProvider = Provider
