import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import {
  appendTurnToAttempt,
  createVivaAttempt,
  createUniqueId,
  getAttemptById,
  listUserAttempts,
  saveAttemptRevision,
} from '#/lib/attempts'
import { runExaminerTurnFn } from '#/server/examiner-turn.fn'
import { runRevisionPointFn } from '#/server/revision-point.fn'
import type { VivaAttempt, VivaMessage } from '#/types/viva'
import { getPublicCaseBriefFn } from '#/server/case-brief.fn'
import { getRequiredIdToken } from '#/lib/token'

export const vivaKeys = {
  attempts: (uid: string | null) => ['viva-attempts', uid] as const,
  attempt: (uid: string | null, attemptId: string | null) =>
    ['viva-attempt', uid, attemptId] as const,
}

export function useUserAttemptsQuery(uid: string | null) {
  return useQuery({
    queryKey: vivaKeys.attempts(uid),
    queryFn: () => listUserAttempts(uid!),
    enabled: Boolean(uid),
  })
}

export function useActiveAttemptQuery(
  uid: string | null,
  attemptId: string | null,
) {
  return useQuery({
    queryKey: vivaKeys.attempt(uid, attemptId),
    queryFn: () => getAttemptById(attemptId!, uid!),
    enabled: Boolean(uid && attemptId),
  })
}

export function useCreateAttemptMutation(uid: string | null) {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (params: {
      caseId: string
      title: string
      openingPrompt: string
    }) => {
      if (!uid) throw new Error('Must be signed in to create an attempt.')
      return createVivaAttempt({
        ownerUid: uid,
        caseId: params.caseId,
        title: params.title,
        openingPrompt: params.openingPrompt,
      })
    },
    onSuccess: (created) => {
      if (!uid) return
      queryClient.setQueryData(vivaKeys.attempt(uid, created.id), created)
      void queryClient.invalidateQueries({ queryKey: vivaKeys.attempts(uid) })
    },
  })
}

export function useProcessVivaTurnMutation(uid: string | null) {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (params: {
      attempt: VivaAttempt
      transcript: string
    }) => {
      if (!uid) {
        throw new Error('Must be signed in to submit a viva turn.')
      }

      const now = Date.now()
      const traineeMsg: VivaMessage = {
        id: createUniqueId('msg_u', now),
        role: 'trainee',
        text: params.transcript,
        createdAt: now,
      }

      const nextHistory = [...params.attempt.messages, traineeMsg]

      const idToken = await getRequiredIdToken()
      const turnResult = await runExaminerTurnFn({
        data: {
          idToken,
          traineeUtterance: params.transcript,
          recentMessages: nextHistory,
        },
      })

      const examinerTimestamp = Math.max(Date.now(), now + 1)
      const matchedIds = Array.from(
        new Set(turnResult.matchedFindings.map((f) => f.id)),
      )
      const examinerMsg: VivaMessage = {
        id: createUniqueId('msg_e', examinerTimestamp),
        role: 'examiner',
        text: turnResult.spokenResponse,
        spokenFollowUp: turnResult.followUpQuestion,
        referencedFindingIds: matchedIds,
        createdAt: examinerTimestamp,
      }

      const persistedUpdatedAt = await appendTurnToAttempt({
        attemptId: params.attempt.id,
        ownerUid: uid,
        newMessages: [traineeMsg, examinerMsg],
        newFindingIds: matchedIds,
        updatedAt: examinerTimestamp,
      })

      const updatedAttempt: VivaAttempt = {
        ...params.attempt,
        messages: [...nextHistory, examinerMsg],
        revealedFindingIds: Array.from(
          new Set([...params.attempt.revealedFindingIds, ...matchedIds]),
        ),
        updatedAt: persistedUpdatedAt,
      }

      return {
        updatedAttempt,
        spokenResponse: turnResult.spokenResponse,
      }
    },
    onSuccess: ({ updatedAttempt }) => {
      if (!uid) return
      queryClient.setQueryData(
        vivaKeys.attempt(uid, updatedAttempt.id),
        updatedAttempt,
      )
      void queryClient.invalidateQueries({ queryKey: vivaKeys.attempts(uid) })
    },
  })
}

export function useGenerateRevisionMutation(uid: string | null) {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (params: { attempt: VivaAttempt }) => {
      if (!uid) {
        throw new Error('Must be signed in to generate a revision point.')
      }

      const idToken = await getRequiredIdToken()
      const { revision, retrievedPages } = await runRevisionPointFn({
        data: {
          idToken,
          messages: params.attempt.messages,
        },
      })

      const revisionTimestamp = Math.max(
        Date.now(),
        params.attempt.updatedAt + 1,
      )
      const persistedUpdatedAt = await saveAttemptRevision({
        attemptId: params.attempt.id,
        ownerUid: uid,
        revisionPoint: revision,
        markCompleted: true,
        updatedAt: revisionTimestamp,
      })

      const updatedAttempt: VivaAttempt = {
        ...params.attempt,
        revisionPoint: revision,
        status: 'completed',
        updatedAt: persistedUpdatedAt,
      }

      return { updatedAttempt, retrievedPages }
    },
    onSuccess: ({ updatedAttempt }) => {
      if (!uid) return
      queryClient.setQueryData(
        vivaKeys.attempt(uid, updatedAttempt.id),
        updatedAttempt,
      )
      void queryClient.invalidateQueries({ queryKey: vivaKeys.attempts(uid) })
    },
  })
}

export function usePublicCaseBriefQuery() {
  return useQuery({
    queryKey: ['public-case-brief', 'EA-VIVA-001'],
    queryFn: () => getPublicCaseBriefFn(),
    staleTime: Infinity,
  })
}
