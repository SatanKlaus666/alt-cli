import { createFileRoute } from '@tanstack/react-router'
import { chat, toServerSentEventsResponse } from '@tanstack/ai'
import { openaiText } from '@tanstack/ai-openai'

export const Route = createFileRoute('/api/chat')({
  server: {
    handlers: {
      POST: async ({ request }: { request: Request }) => {
        const { messages } = await request.json()

        const stream = chat({
          adapter: openaiText('gpt-4o-mini'),
          messages,
        })

        return toServerSentEventsResponse(stream)
      },
    },
  },
})
