import { ClerkProvider as BaseClerkProvider } from '@clerk/tanstack-start'

export function ClerkProvider({ children }: { children: React.ReactNode }) {
  return <BaseClerkProvider>{children}</BaseClerkProvider>
}
