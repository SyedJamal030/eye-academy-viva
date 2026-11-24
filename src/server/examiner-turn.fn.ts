import { createServerFn } from '@tanstack/react-start'
import { generateExaminerTurn } from '#/lib/examiner-turn'
import { examinerTurnInputSchema } from './schema/viva-schemas'

export const runExaminerTurnFn = createServerFn({ method: 'POST' })
  .validator((data: unknown) => examinerTurnInputSchema.parse(data))
  .handler(async ({ data }) => {
    return generateExaminerTurn({
      traineeUtterance: data.traineeUtterance,
      recentMessages: data.recentMessages,
    })
  })
