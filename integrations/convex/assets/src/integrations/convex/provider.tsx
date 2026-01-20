import {
  ConvexProvider as BaseConvexProvider,
  ConvexReactClient,
} from 'convex/react'
import { ConvexQueryClient } from '@convex-dev/react-query'
import { QueryClient } from '@tanstack/react-query'
import type { ReactNode } from 'react'

const convex = new ConvexReactClient(import.meta.env.VITE_CONVEX_URL)
const convexQueryClient = new ConvexQueryClient(convex)

// Create a QueryClient that uses Convex
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      queryKeyHashFn: convexQueryClient.hashFn(),
      queryFn: convexQueryClient.queryFn(),
    },
  },
})
convexQueryClient.connect(queryClient)

interface ConvexProviderProps {
  children: ReactNode
}

export function ConvexProvider({ children }: ConvexProviderProps) {
  return <BaseConvexProvider client={convex}>{children}</BaseConvexProvider>
}
