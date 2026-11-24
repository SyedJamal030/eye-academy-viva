import { z } from 'zod'

export const vivaMessageSchema = z.object({
  id: z.string().min(1).max(128),
  role: z.enum(['examiner', 'trainee']),
  text: z.string().min(1).max(4000),
  spokenFollowUp: z.string().max(1000).optional(),
  referencedFindingIds: z.array(z.string().min(1).max(128)).max(50).optional(),
  createdAt: z.number().finite().nonnegative(),
})

export const examinerTurnInputSchema = z.object({
  idToken: z.string().min(1).max(4096),
  traineeUtterance: z.string().trim().min(1).max(2000),
  recentMessages: z.array(vivaMessageSchema).max(50),
})

export const revisionPointInputSchema = z.object({
  idToken: z.string().min(1).max(4096),
  messages: z.array(vivaMessageSchema).min(1).max(100),
})
