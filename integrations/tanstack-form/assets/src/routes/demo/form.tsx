import { createFileRoute, Link } from '@tanstack/react-router'
import { useForm } from '@tanstack/react-form'

export const Route = createFileRoute('/demo/form')({
  component: FormDemo,
})

function FormDemo() {
  const form = useForm({
    defaultValues: {
      firstName: '',
      lastName: '',
      email: '',
    },
    onSubmit: async ({ value }) => {
      // Simulate API call
      await new Promise((resolve) => setTimeout(resolve, 1000))
      alert(JSON.stringify(value, null, 2))
    },
  })

  return (
    <div className="min-h-screen bg-gray-900 text-white p-8">
      <div className="max-w-md mx-auto">
        <h1 className="text-3xl font-bold mb-6">TanStack Form Demo</h1>

        <form
          onSubmit={(e) => {
            e.preventDefault()
            e.stopPropagation()
            form.handleSubmit()
          }}
          className="space-y-4"
        >
          <form.Field
            name="firstName"
            validators={{
              onChange: ({ value }) =>
                value.length < 2 ? 'Must be at least 2 characters' : undefined,
            }}
          >
            {(field) => (
              <div>
                <label className="block text-sm font-medium mb-1">
                  First Name
                </label>
                <input
                  type="text"
                  value={field.state.value}
                  onChange={(e) => field.handleChange(e.target.value)}
                  onBlur={field.handleBlur}
                  className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-cyan-500"
                />
                {field.state.meta.errors.length > 0 && (
                  <p className="text-red-400 text-sm mt-1">
                    {field.state.meta.errors.join(', ')}
                  </p>
                )}
              </div>
            )}
          </form.Field>

          <form.Field name="lastName">
            {(field) => (
              <div>
                <label className="block text-sm font-medium mb-1">
                  Last Name
                </label>
                <input
                  type="text"
                  value={field.state.value}
                  onChange={(e) => field.handleChange(e.target.value)}
                  onBlur={field.handleBlur}
                  className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-cyan-500"
                />
              </div>
            )}
          </form.Field>

          <form.Field
            name="email"
            validators={{
              onChange: ({ value }) =>
                !value.includes('@') ? 'Must be a valid email' : undefined,
            }}
          >
            {(field) => (
              <div>
                <label className="block text-sm font-medium mb-1">Email</label>
                <input
                  type="email"
                  value={field.state.value}
                  onChange={(e) => field.handleChange(e.target.value)}
                  onBlur={field.handleBlur}
                  className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-cyan-500"
                />
                {field.state.meta.errors.length > 0 && (
                  <p className="text-red-400 text-sm mt-1">
                    {field.state.meta.errors.join(', ')}
                  </p>
                )}
              </div>
            )}
          </form.Field>

          <form.Subscribe
            selector={(state) => [state.canSubmit, state.isSubmitting]}
          >
            {([canSubmit, isSubmitting]) => (
              <button
                type="submit"
                disabled={!canSubmit}
                className="w-full py-2 px-4 bg-cyan-600 hover:bg-cyan-500 disabled:bg-gray-700 disabled:cursor-not-allowed rounded-lg font-medium transition-colors"
              >
                {isSubmitting ? 'Submitting...' : 'Submit'}
              </button>
            )}
          </form.Subscribe>
        </form>

        <div className="mt-8">
          <Link to="/" className="text-cyan-400 hover:text-cyan-300">
            &larr; Back to Home
          </Link>
        </div>
      </div>
    </div>
  )
}
