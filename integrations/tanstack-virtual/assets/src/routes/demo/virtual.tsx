import { useRef } from 'react'
import { createFileRoute, Link } from '@tanstack/react-router'
import { useVirtualizer } from '@tanstack/react-virtual'

export const Route = createFileRoute('/demo/virtual')({
  component: VirtualDemo,
})

const items = Array.from({ length: 10000 }, (_, i) => ({
  id: i,
  name: `Item ${i + 1}`,
  description: `This is the description for item number ${i + 1}`,
}))

function VirtualDemo() {
  const parentRef = useRef<HTMLDivElement>(null)

  const virtualizer = useVirtualizer({
    count: items.length,
    getScrollElement: () => parentRef.current,
    estimateSize: () => 72,
    overscan: 5,
  })

  return (
    <div className="min-h-screen bg-gray-900 text-white p-8">
      <div className="max-w-2xl mx-auto">
        <h1 className="text-3xl font-bold mb-2">TanStack Virtual Demo</h1>
        <p className="text-gray-400 mb-6">
          Rendering {items.length.toLocaleString()} items with virtualization.
          Only visible items are in the DOM.
        </p>

        <div className="bg-gray-800 rounded-lg p-4 mb-4 flex justify-between text-sm">
          <div>
            <span className="text-gray-400">Total items:</span>{' '}
            <span className="text-purple-400 font-mono">{items.length.toLocaleString()}</span>
          </div>
          <div>
            <span className="text-gray-400">Rendered:</span>{' '}
            <span className="text-purple-400 font-mono">
              {virtualizer.getVirtualItems().length}
            </span>
          </div>
        </div>

        <div
          ref={parentRef}
          className="h-[500px] overflow-auto bg-gray-800 rounded-lg"
        >
          <div
            style={{
              height: `${virtualizer.getTotalSize()}px`,
              width: '100%',
              position: 'relative',
            }}
          >
            {virtualizer.getVirtualItems().map((virtualRow) => {
              const item = items[virtualRow.index]
              return (
                <div
                  key={virtualRow.key}
                  style={{
                    position: 'absolute',
                    top: 0,
                    left: 0,
                    width: '100%',
                    height: `${virtualRow.size}px`,
                    transform: `translateY(${virtualRow.start}px)`,
                  }}
                  className="px-4 py-3 border-b border-gray-700"
                >
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="font-medium">{item.name}</div>
                      <div className="text-sm text-gray-400">{item.description}</div>
                    </div>
                    <div className="text-xs text-gray-500 font-mono">
                      #{virtualRow.index}
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        </div>

        <div className="mt-4 bg-gray-800 rounded-lg p-4">
          <h2 className="font-semibold mb-2">Why Virtualization?</h2>
          <ul className="text-sm text-gray-400 space-y-1">
            <li>Renders only visible items (plus a small overscan buffer)</li>
            <li>Constant memory usage regardless of list size</li>
            <li>Smooth scrolling performance with 60fps</li>
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
