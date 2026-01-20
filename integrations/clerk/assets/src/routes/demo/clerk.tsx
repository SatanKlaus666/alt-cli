import { createFileRoute, Link } from '@tanstack/react-router'
import {
  SignedIn,
  SignedOut,
  SignInButton,
  useUser,
} from '@clerk/tanstack-start'

export const Route = createFileRoute('/demo/clerk')({
  component: ClerkDemo,
})

function ClerkDemo() {
  return (
    <div className="min-h-screen bg-gray-900 text-white p-8">
      <div className="max-w-md mx-auto">
        <h1 className="text-3xl font-bold mb-6">Clerk Auth Demo</h1>

        <SignedOut>
          <div className="bg-gray-800 rounded-lg p-6 text-center">
            <p className="mb-4 text-gray-400">
              You are not signed in. Click below to authenticate.
            </p>
            <SignInButton mode="modal">
              <button className="px-6 py-2 bg-blue-600 hover:bg-blue-500 rounded-lg font-medium transition-colors">
                Sign In with Clerk
              </button>
            </SignInButton>
          </div>
        </SignedOut>

        <SignedIn>
          <UserInfo />
        </SignedIn>

        <div className="mt-8">
          <Link to="/" className="text-cyan-400 hover:text-cyan-300">
            &larr; Back to Home
          </Link>
        </div>
      </div>
    </div>
  )
}

function UserInfo() {
  const { user } = useUser()

  return (
    <div className="bg-gray-800 rounded-lg p-6">
      <h2 className="text-xl font-semibold mb-4">Welcome!</h2>
      <div className="space-y-2 text-gray-300">
        <p>
          <span className="text-gray-500">Email:</span>{' '}
          {user?.primaryEmailAddress?.emailAddress}
        </p>
        <p>
          <span className="text-gray-500">Name:</span>{' '}
          {user?.fullName || 'Not set'}
        </p>
        <p>
          <span className="text-gray-500">ID:</span> {user?.id}
        </p>
      </div>
    </div>
  )
}
