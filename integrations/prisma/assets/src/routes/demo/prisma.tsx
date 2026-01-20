import { createFileRoute, Link } from '@tanstack/react-router'
import { createServerFn } from '@tanstack/react-start'
import { prisma } from '~/db'

const getTodos = createServerFn({ method: 'GET' }).handler(async () => {
  try {
    return await prisma.todo.findMany({ orderBy: { createdAt: 'desc' } })
  } catch {
    return []
  }
})

export const Route = createFileRoute('/demo/prisma')({
  loader: () => getTodos(),
  component: PrismaDemo,
})

function PrismaDemo() {
  const todos = Route.useLoaderData()

  return (
    <div className="min-h-screen bg-gray-900 text-white p-8">
      <div className="max-w-2xl mx-auto">
        <h1 className="text-3xl font-bold mb-6">Prisma Demo</h1>

        <div className="bg-gray-800 rounded-lg p-4 mb-6">
          <h2 className="text-lg font-semibold mb-2">Todos from Database</h2>
          {todos.length === 0 ? (
            <p className="text-gray-400">
              No todos yet. Run migrations and seed:
              <code className="block mt-2 bg-gray-900 p-2 rounded text-cyan-400">
                pnpm db:generate && pnpm db:push && pnpm db:seed
              </code>
            </p>
          ) : (
            <ul className="space-y-2">
              {todos.map((todo) => (
                <li key={todo.id} className="flex items-center gap-2">
                  <span className="text-cyan-400">{todo.id}.</span>
                  <span>{todo.title}</span>
                </li>
              ))}
            </ul>
          )}
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
