import {
  SignedIn,
  SignedOut,
  UserButton,
  SignInButton,
} from '@clerk/tanstack-start'

export function ClerkHeaderUser() {
  return (
    <>
      <SignedOut>
        <SignInButton mode="modal">
          <button className="px-4 py-2 bg-blue-600 hover:bg-blue-500 rounded-lg text-sm font-medium transition-colors">
            Sign In
          </button>
        </SignInButton>
      </SignedOut>
      <SignedIn>
        <UserButton afterSignOutUrl="/" />
      </SignedIn>
    </>
  )
}
