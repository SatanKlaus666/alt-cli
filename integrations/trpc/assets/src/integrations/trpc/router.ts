import { initTRPC } from '@trpc/server'
import superjson from 'superjson'
import { z } from 'zod'

const t = initTRPC.create({
  transformer: superjson,
})

export const router = t.router
export const publicProcedure = t.procedure

export const appRouter = router({
  hello: publicProcedure
    .input(z.object({ name: z.string().optional() }))
    .query(({ input }) => {
      return { greeting: `Hello ${input.name ?? 'World'}!` }
    }),

  getItems: publicProcedure.query(() => {
    return [
      { id: 1, name: 'Item 1' },
      { id: 2, name: 'Item 2' },
      { id: 3, name: 'Item 3' },
    ]
  }),
})

export type AppRouter = typeof appRouter
