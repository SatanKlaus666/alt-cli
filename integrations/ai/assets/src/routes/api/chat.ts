import { createFileRoute } from '@tanstack/react-router'
import { openai } from '@ai-sdk/openai'
import { streamText } from 'ai'

export const Route = createFileRoute('/api/chat')({
  // @ts-expect-error server property not in route types yet
  server: {
    handlers: {
      POST: async ({ request }: { request: Request }) => {
        const { messages } = await request.json()

        const result = await streamText({
          model: openai('gpt-4o-mini'),
          messages,
        })

        return result.toDataStreamResponse()
      },
    },
  },
})
