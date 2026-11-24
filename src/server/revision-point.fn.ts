import { createServerFn } from '@tanstack/react-start'
import { generateCitedRevisionPoint } from '#/lib/revision-generator'
import { revisionPointInputSchema } from './schema/viva-schemas'
import { verifyFirebaseIdToken } from './verify-firebase-token'

export const runRevisionPointFn = createServerFn({ method: 'POST' })
  .validator((data: unknown) => revisionPointInputSchema.parse(data))
  .handler(async ({ data }) => {
    await verifyFirebaseIdToken(data.idToken)

    return generateCitedRevisionPoint({
      messages: data.messages,
    })
  })
