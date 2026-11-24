import { createServerFn } from '@tanstack/react-start'
import { z } from 'zod'
import { generateCitedRevisionPoint } from '../lib/revision-generator'

const revisionPointInputSchema = z.object({
  messages: z.array(
    z.object({
      id: z.string(),
      role: z.enum(['examiner', 'trainee']),
      text: z.string(),
      spokenFollowUp: z.string().optional(),
      referencedFindingIds: z.array(z.string()).optional(),
      createdAt: z.number(),
    }),
  ),
})

export const runRevisionPointFn = createServerFn({ method: 'POST' })
  .validator((data: unknown) => revisionPointInputSchema.parse(data))
  .handler(async ({ data }) => {
    return generateCitedRevisionPoint({
      messages: data.messages,
    })
  })
