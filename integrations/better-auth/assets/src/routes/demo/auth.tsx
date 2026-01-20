import { createFileRoute, Link } from '@tanstack/react-router'
import { useState } from 'react'
import { signIn, signUp, signOut, useSession } from '~/lib/auth-client'

export const Route = createFileRoute('/demo/auth')({
  component: AuthDemo,
})

function AuthDemo() {
  const { data: session, isPending } = useSession()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [name, setName] = useState('')
  const [isSignUp, setIsSignUp] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    setLoading(true)

    try {
      if (isSignUp) {
        await signUp.email({ email, password, name })
      } else {
        await signIn.email({ email, password })
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Authentication failed')
    } finally {
      setLoading(false)
    }
  }

  if (isPending) {
    return (
      <div className="min-h-screen bg-gray-900 text-white flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-cyan-400" />
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-900 text-white p-8">
      <div className="max-w-md mx-auto">
        <h1 className="text-3xl font-bold mb-6">Better Auth Demo</h1>

        {session?.user ? (
          <div className="bg-gray-800 rounded-lg p-6">
            <h2 className="text-xl font-semibold mb-4">Welcome!</h2>
            <div className="space-y-2 mb-6">
              <p>
                <span className="text-gray-400">Email:</span>{' '}
                {session.user.email}
              </p>
              {session.user.name && (
                <p>
                  <span className="text-gray-400">Name:</span>{' '}
                  {session.user.name}
                </p>
              )}
            </div>
            <button
              onClick={() => signOut()}
              className="w-full bg-red-600 hover:bg-red-700 text-white py-2 px-4 rounded"
            >
              Sign Out
            </button>
          </div>
        ) : (
          <div className="bg-gray-800 rounded-lg p-6">
            <div className="flex gap-4 mb-6">
              <button
                onClick={() => setIsSignUp(false)}
                className={`flex-1 py-2 rounded ${!isSignUp ? 'bg-cyan-600' : 'bg-gray-700'}`}
              >
                Sign In
              </button>
              <button
                onClick={() => setIsSignUp(true)}
                className={`flex-1 py-2 rounded ${isSignUp ? 'bg-cyan-600' : 'bg-gray-700'}`}
              >
                Sign Up
              </button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              {isSignUp && (
                <input
                  type="text"
                  placeholder="Name"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full bg-gray-900 border border-gray-700 rounded px-3 py-2"
                />
              )}
              <input
                type="email"
                placeholder="Email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                className="w-full bg-gray-900 border border-gray-700 rounded px-3 py-2"
              />
              <input
                type="password"
                placeholder="Password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                className="w-full bg-gray-900 border border-gray-700 rounded px-3 py-2"
              />

              {error && <p className="text-red-400 text-sm">{error}</p>}

              <button
                type="submit"
                disabled={loading}
                className="w-full bg-cyan-600 hover:bg-cyan-700 disabled:bg-gray-600 text-white py-2 px-4 rounded"
              >
                {loading ? 'Loading...' : isSignUp ? 'Sign Up' : 'Sign In'}
              </button>
            </form>

            <p className="mt-4 text-sm text-gray-400">
              Run migrations first:{' '}
              <code className="bg-gray-900 px-2 py-1 rounded">
                pnpm db:auth:migrate
              </code>
            </p>
          </div>
        )}

        <div className="mt-8">
          <Link to="/" className="text-cyan-400 hover:text-cyan-300">
            &larr; Back to Home
          </Link>
        </div>
      </div>
    </div>
  )
}
