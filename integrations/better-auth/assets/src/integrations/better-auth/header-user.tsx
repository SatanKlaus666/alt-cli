import { Link } from '@tanstack/react-router'
import { useSession, signOut } from '~/lib/auth-client'

export function BetterAuthHeaderUser() {
  const { data: session, isPending } = useSession()

  if (isPending) {
    return <div className="w-8 h-8 rounded-full bg-gray-700 animate-pulse" />
  }

  if (!session?.user) {
    return (
      <Link
        to="/demo/auth"
        className="text-sm text-cyan-400 hover:text-cyan-300"
      >
        Sign In
      </Link>
    )
  }

  return (
    <div className="flex items-center gap-3">
      <span className="text-sm text-gray-300">{session.user.email}</span>
      <button
        onClick={() => signOut()}
        className="text-sm text-gray-400 hover:text-white"
      >
        Sign Out
      </button>
    </div>
  )
}
