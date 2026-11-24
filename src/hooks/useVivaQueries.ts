import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import {
  appendTurnToAttempt,
  createVivaAttempt,
  getAttemptById,
  listUserAttempts,
  saveAttemptRevision,
} from '../lib/attempts'
import { runExaminerTurnFn } from '../server/examiner-turn.fn'
import { runRevisionPointFn } from '../server/revision-point.fn'
import type { VivaAttempt, VivaMessage } from '../types/viva'

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
      const now = Date.now()
      const traineeMsg: VivaMessage = {
        id: `msg_${now}_u`,
        role: 'trainee',
        text: params.transcript,
        createdAt: now,
      }

      const nextHistory = [...params.attempt.messages, traineeMsg]

      const turnResult = await runExaminerTurnFn({
        data: {
          traineeUtterance: params.transcript,
          recentMessages: nextHistory,
        },
      })

      const matchedIds = turnResult.matchedFindings.map((f) => f.id)
      const examinerMsg: VivaMessage = {
        id: `msg_${now + 1}_e`,
        role: 'examiner',
        text: turnResult.spokenResponse,
        spokenFollowUp: turnResult.followUpQuestion,
        referencedFindingIds: matchedIds,
        createdAt: now + 1,
      }

      await appendTurnToAttempt({
        attemptId: params.attempt.id,
        newMessages: [traineeMsg, examinerMsg],
        newFindingIds: matchedIds,
      })

      const updatedAttempt: VivaAttempt = {
        ...params.attempt,
        messages: [...nextHistory, examinerMsg],
        revealedFindingIds: Array.from(
          new Set([...params.attempt.revealedFindingIds, ...matchedIds]),
        ),
        updatedAt: now + 1,
      }

      return {
        updatedAttempt,
        spokenResponse: turnResult.spokenResponse,
      }
    },
    onSuccess: ({ updatedAttempt }) => {
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
      const { revision, retrievedPages } = await runRevisionPointFn({
        data: {
          messages: params.attempt.messages,
        },
      })

      await saveAttemptRevision({
        attemptId: params.attempt.id,
        revisionPoint: revision,
        markCompleted: true,
      })

      const updatedAttempt: VivaAttempt = {
        ...params.attempt,
        revisionPoint: revision,
        status: 'completed',
        updatedAt: Date.now(),
      }

      return { updatedAttempt, retrievedPages }
    },
    onSuccess: ({ updatedAttempt }) => {
      queryClient.setQueryData(
        vivaKeys.attempt(uid, updatedAttempt.id),
        updatedAttempt,
      )
      void queryClient.invalidateQueries({ queryKey: vivaKeys.attempts(uid) })
    },
  })
}
