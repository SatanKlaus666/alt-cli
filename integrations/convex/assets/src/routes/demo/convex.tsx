import { createFileRoute, Link } from '@tanstack/react-router'
import { useQuery, useMutation } from 'convex/react'
import { api } from 'convex/_generated/api'
import { useState } from 'react'

export const Route = createFileRoute('/demo/convex')({
  ssr: false,
  component: ConvexDemo,
})

function ConvexDemo() {
  const todos = useQuery(api.todos.list)
  const addTodo = useMutation(api.todos.add)
  const toggleTodo = useMutation(api.todos.toggle)
  const removeTodo = useMutation(api.todos.remove)

  const [newTodo, setNewTodo] = useState('')

  const handleAdd = async () => {
    if (!newTodo.trim()) return
    await addTodo({ text: newTodo })
    setNewTodo('')
  }

  return (
    <div className="min-h-screen bg-gray-900 text-white p-8">
      <div className="max-w-md mx-auto">
        <h1 className="text-3xl font-bold mb-6">Convex Demo</h1>

        <div className="bg-gray-800 rounded-lg p-6">
          <div className="flex gap-2 mb-4">
            <input
              type="text"
              value={newTodo}
              onChange={(e) => setNewTodo(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleAdd()}
              placeholder="Add a todo..."
              className="flex-1 bg-gray-900 border border-gray-700 rounded px-3 py-2"
            />
            <button
              onClick={handleAdd}
              className="bg-cyan-600 hover:bg-cyan-700 px-4 py-2 rounded"
            >
              Add
            </button>
          </div>

          {todos === undefined ? (
            <div className="text-gray-400">Loading...</div>
          ) : todos.length === 0 ? (
            <div className="text-gray-400">No todos yet</div>
          ) : (
            <ul className="space-y-2">
              {todos.map((todo) => (
                <li
                  key={todo._id}
                  className="flex items-center gap-2 bg-gray-700 rounded p-2"
                >
                  <input
                    type="checkbox"
                    checked={todo.completed}
                    onChange={() => toggleTodo({ id: todo._id })}
                    className="rounded"
                  />
                  <span
                    className={
                      todo.completed ? 'line-through text-gray-400' : ''
                    }
                  >
                    {todo.text}
                  </span>
                  <button
                    onClick={() => removeTodo({ id: todo._id })}
                    className="ml-auto text-red-400 hover:text-red-300"
                  >
                    ×
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>

        <p className="mt-4 text-sm text-gray-400">
          Run{' '}
          <code className="bg-gray-800 px-2 py-1 rounded">pnpm convex:dev</code>{' '}
          to start Convex
        </p>

        <div className="mt-8">
          <Link to="/" className="text-cyan-400 hover:text-cyan-300">
            &larr; Back to Home
          </Link>
        </div>
      </div>
    </div>
  )
}
