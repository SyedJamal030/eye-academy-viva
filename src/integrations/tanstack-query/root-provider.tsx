import { useState } from 'react'
import type { ReactNode } from 'react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'

function createQueryClient() {
  return new QueryClient({
    defaultOptions: {
      queries: {
        staleTime: 1000 * 60,
        retry: 1,
      },
    },
  })
}

export function getContext() {
  return {
    queryClient: createQueryClient(),
  }
}

export function Provider({ children }: { children: ReactNode }) {
  const [client] = useState(() => createQueryClient())
  return <QueryClientProvider client={client}>{children}</QueryClientProvider>
}

export const TanStackQueryProvider = Provider
