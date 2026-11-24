import { createServerFn } from '@tanstack/react-start'
import { z } from 'zod'
import { generateExaminerTurn } from '../lib/examiner-turn'

const examinerTurnInputSchema = z.object({
  traineeUtterance: z.string().min(1),
  recentMessages: z.array(
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

export const runExaminerTurnFn = createServerFn({ method: 'POST' })
  .validator((data: unknown) => examinerTurnInputSchema.parse(data))
  .handler(async ({ data }) => {
    return generateExaminerTurn({
      traineeUtterance: data.traineeUtterance,
      recentMessages: data.recentMessages,
    })
  })
