import { createServerFn } from '@tanstack/react-start'
import { generateExaminerTurn } from '#/lib/examiner-turn'
import { examinerTurnInputSchema } from './schema/viva-schemas'
import { verifyFirebaseIdToken } from './verify-firebase-token'

export const runExaminerTurnFn = createServerFn({ method: 'POST' })
  .validator((data: unknown) => examinerTurnInputSchema.parse(data))
  .handler(async ({ data }) => {
    await verifyFirebaseIdToken(data.idToken)

    return generateExaminerTurn({
      traineeUtterance: data.traineeUtterance,
      recentMessages: data.recentMessages,
    })
  })
