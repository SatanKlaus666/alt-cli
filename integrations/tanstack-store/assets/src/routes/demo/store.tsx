import { createFileRoute, Link } from '@tanstack/react-router'
import { useStore } from '@tanstack/react-store'
import { counterStore, increment, decrement, reset } from '~/lib/demo-store'

export const Route = createFileRoute('/demo/store')({
  component: StoreDemo,
})

function StoreDemo() {
  const { count, lastUpdated } = useStore(counterStore)

  return (
    <div className="min-h-screen bg-gray-900 text-white p-8">
      <div className="max-w-md mx-auto">
        <h1 className="text-3xl font-bold mb-6">TanStack Store Demo</h1>

        <div className="bg-gray-800 rounded-lg p-6 mb-6">
          <div className="text-6xl font-bold text-center mb-4">{count}</div>

          <div className="flex justify-center gap-4">
            <button
              onClick={decrement}
              className="px-6 py-2 bg-red-600 hover:bg-red-500 rounded-lg font-medium transition-colors"
            >
              -
            </button>
            <button
              onClick={reset}
              className="px-6 py-2 bg-gray-600 hover:bg-gray-500 rounded-lg font-medium transition-colors"
            >
              Reset
            </button>
            <button
              onClick={increment}
              className="px-6 py-2 bg-green-600 hover:bg-green-500 rounded-lg font-medium transition-colors"
            >
              +
            </button>
          </div>

          {lastUpdated && (
            <div className="text-center text-gray-400 mt-4 text-sm">
              Last updated: {lastUpdated.toLocaleTimeString()}
            </div>
          )}
        </div>

        <div className="bg-gray-800 rounded-lg p-4">
          <h2 className="font-semibold mb-2">Store State</h2>
          <pre className="text-sm text-gray-400 overflow-auto">
            {JSON.stringify({ count, lastUpdated }, null, 2)}
          </pre>
        </div>

        <div className="mt-8">
          <Link to="/" className="text-cyan-400 hover:text-cyan-300">
            &larr; Back to Home
          </Link>
        </div>
      </div>
    </div>
  )
}
