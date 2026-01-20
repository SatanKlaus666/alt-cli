import { useCallback, useState } from 'react'
import { createFileRoute, Link } from '@tanstack/react-router'
import { useMutation, useQuery } from '@tanstack/react-query'

import { orpc } from '~/orpc/client'

export const Route = createFileRoute('/demo/orpc-todo')({
  component: ORPCTodos,
  loader: async ({ context }) => {
    await context.queryClient.prefetchQuery(
      orpc.listTodos.queryOptions({
        input: {},
      }),
    )
  },
})

function ORPCTodos() {
  const { data, refetch } = useQuery(
    orpc.listTodos.queryOptions({
      input: {},
    }),
  )

  const [todo, setTodo] = useState('')
  const { mutate: addTodo } = useMutation({
    mutationFn: orpc.addTodo.call,
    onSuccess: () => {
      refetch()
      setTodo('')
    },
  })

  const submitTodo = useCallback(() => {
    addTodo({ name: todo })
  }, [addTodo, todo])

  return (
    <div className="min-h-screen bg-gray-900 text-white p-8">
      <div className="max-w-2xl mx-auto">
        <h1 className="text-3xl font-bold mb-6">oRPC Todos</h1>

        <div className="bg-gray-800 rounded-lg p-6 mb-6">
          <ul className="space-y-2 mb-4">
            {data?.map((t) => (
              <li
                key={t.id}
                className="bg-gray-700 rounded-lg p-3 flex items-center gap-2"
              >
                <span className="text-cyan-400">{t.id}.</span>
                <span>{t.name}</span>
              </li>
            ))}
          </ul>

          <div className="flex gap-2">
            <input
              type="text"
              value={todo}
              onChange={(e) => setTodo(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  submitTodo()
                }
              }}
              placeholder="Enter a new todo..."
              className="flex-1 bg-gray-900 border border-gray-700 rounded px-3 py-2"
            />
            <button
              disabled={todo.trim().length === 0}
              onClick={submitTodo}
              className="bg-cyan-600 hover:bg-cyan-700 disabled:bg-gray-600 px-4 py-2 rounded"
            >
              Add
            </button>
          </div>
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
