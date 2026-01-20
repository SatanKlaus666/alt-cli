import type { ReactNode } from 'react'

interface BetterAuthProviderProps {
  children: ReactNode
}

export function BetterAuthProvider({ children }: BetterAuthProviderProps) {
  // Better Auth uses React Query internally via useSession hook
  // No additional context provider needed
  return <>{children}</>
}
