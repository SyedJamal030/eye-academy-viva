import { createServerFn } from '@tanstack/react-start'
import { generateCitedRevisionPoint } from '#/lib/revision-generator'
import { revisionPointInputSchema } from './schema/viva-schemas'

export const runRevisionPointFn = createServerFn({ method: 'POST' })
  .validator((data: unknown) => revisionPointInputSchema.parse(data))
  .handler(async ({ data }) => {
    return generateCitedRevisionPoint({
      messages: data.messages,
    })
  })
