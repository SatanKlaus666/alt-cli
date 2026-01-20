import { useState } from 'react'
import { createFileRoute, Link } from '@tanstack/react-router'
import { useDebounce, useThrottle } from '@tanstack/react-pacer'

export const Route = createFileRoute('/demo/pacer')({
  component: PacerDemo,
})

function PacerDemo() {
  const [searchTerm, setSearchTerm] = useState('')
  const [clickCount, setClickCount] = useState(0)
  const [debouncedCount, setDebouncedCount] = useState(0)
  const [throttledCount, setThrottledCount] = useState(0)

  const debouncedSearch = useDebounce(searchTerm, { wait: 500 })
  
  const handleDebouncedClick = useDebounce(
    () => setDebouncedCount((c) => c + 1),
    { wait: 300 }
  )

  const handleThrottledClick = useThrottle(
    () => setThrottledCount((c) => c + 1),
    { wait: 500 }
  )

  return (
    <div className="min-h-screen bg-gray-900 text-white p-8">
      <div className="max-w-xl mx-auto">
        <h1 className="text-3xl font-bold mb-6">TanStack Pacer Demo</h1>

        <div className="bg-gray-800 rounded-lg p-6 mb-6">
          <h2 className="text-xl font-semibold mb-4">Debounced Search</h2>
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Type to search..."
            className="w-full px-4 py-2 bg-gray-700 border border-gray-600 rounded-lg focus:outline-none focus:border-lime-500 mb-4"
          />
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div>
              <span className="text-gray-400">Current value:</span>
              <div className="font-mono text-lime-400">{searchTerm || '(empty)'}</div>
            </div>
            <div>
              <span className="text-gray-400">Debounced (500ms):</span>
              <div className="font-mono text-lime-400">{debouncedSearch || '(empty)'}</div>
            </div>
          </div>
        </div>

        <div className="bg-gray-800 rounded-lg p-6 mb-6">
          <h2 className="text-xl font-semibold mb-4">Click Rate Limiting</h2>
          <p className="text-gray-400 mb-4">Click rapidly to see the difference between debounce and throttle.</p>
          
          <div className="grid grid-cols-3 gap-4">
            <div className="text-center">
              <button
                onClick={() => setClickCount((c) => c + 1)}
                className="w-full px-4 py-3 bg-gray-600 hover:bg-gray-500 rounded-lg font-medium transition-colors mb-2"
              >
                Normal
              </button>
              <div className="text-2xl font-bold">{clickCount}</div>
              <div className="text-xs text-gray-400">Every click</div>
            </div>
            
            <div className="text-center">
              <button
                onClick={handleDebouncedClick}
                className="w-full px-4 py-3 bg-lime-600 hover:bg-lime-500 rounded-lg font-medium transition-colors mb-2"
              >
                Debounced
              </button>
              <div className="text-2xl font-bold">{debouncedCount}</div>
              <div className="text-xs text-gray-400">300ms wait</div>
            </div>
            
            <div className="text-center">
              <button
                onClick={handleThrottledClick}
                className="w-full px-4 py-3 bg-cyan-600 hover:bg-cyan-500 rounded-lg font-medium transition-colors mb-2"
              >
                Throttled
              </button>
              <div className="text-2xl font-bold">{throttledCount}</div>
              <div className="text-xs text-gray-400">500ms limit</div>
            </div>
          </div>
        </div>

        <div className="bg-gray-800 rounded-lg p-4">
          <h2 className="font-semibold mb-2">How It Works</h2>
          <ul className="text-sm text-gray-400 space-y-1">
            <li><strong className="text-lime-400">Debounce:</strong> Waits until you stop triggering for N ms</li>
            <li><strong className="text-cyan-400">Throttle:</strong> Executes at most once per N ms</li>
          </ul>
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
