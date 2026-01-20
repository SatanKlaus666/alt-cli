import { createFileRoute } from '@tanstack/react-router'
import * as m from '~/paraglide/messages'
import { languageTag } from '~/paraglide/runtime'

export const Route = createFileRoute('/demo/i18n')({
  component: I18nDemo,
})

function I18nDemo() {
  return (
    <div className="p-4">
      <h1 className="text-2xl font-bold mb-4">i18n Demo</h1>
      <p className="mb-2">Current language: {languageTag()}</p>
      <p className="mb-2">{m.hello()}</p>
      <p className="mb-2">{m.welcome({ name: 'TanStack' })}</p>
      <p>{m.items_count({ count: 5 })}</p>
    </div>
  )
}
