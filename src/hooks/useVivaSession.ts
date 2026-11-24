import { useCallback, useMemo, useState } from 'react'
import rawCaseData from '#/data/case-ea-viva-001.json'
import { useAttemptSelection } from '#/hooks/useAttemptSelection'
import { useAuth } from '#/hooks/useAuth'
import {
  useActiveAttemptQuery,
  useCreateAttemptMutation,
  useGenerateRevisionMutation,
  useProcessVivaTurnMutation,
  useUserAttemptsQuery,
} from '#/hooks/useVivaQueries'
import { useVivaTurnController } from '#/hooks/useVivaTurnController'
import { getAllCaseFindings } from '#/lib/findings'
import type { VivaCaseData } from '#/types/viva'

const caseData = rawCaseData as VivaCaseData

export function useVivaSession() {
  const { user, signOutUser } = useAuth()
  const [pageError, setPageError] = useState<string | null>(null)

  const uid = user?.uid ?? null
  const allFindings = useMemo(() => getAllCaseFindings(), [])

  const attemptsQuery = useUserAttemptsQuery(uid)
  const createAttemptMutation = useCreateAttemptMutation(uid)
  const processTurnMutation = useProcessVivaTurnMutation(uid)
  const generateRevisionMutation = useGenerateRevisionMutation(uid)

  const existingList = attemptsQuery.data ?? []

  const clearPageError = useCallback(() => {
    setPageError(null)
  }, [])

  const { resolvedAttemptId, selectAttempt, handleNewAttempt } =
    useAttemptSelection({
      caseData,
      attempts: existingList,
      isLoadingAttempts: attemptsQuery.isLoading,
      isCreatingAttempt: createAttemptMutation.isPending,
      createAttempt: createAttemptMutation.mutateAsync,
      onError: setPageError,
    })

  const activeAttemptQuery = useActiveAttemptQuery(uid, resolvedAttemptId)
  const activeAttempt =
    activeAttemptQuery.data ??
    existingList.find((a) => a.id === resolvedAttemptId) ??
    null

  const {
    typedInput,
    setTypedInput,
    speechError,
    isBusy,
    voice,
    handleTextSubmit,
  } = useVivaTurnController({
    activeAttempt,
    isProcessingTurn: processTurnMutation.isPending,
    processTurn: processTurnMutation.mutateAsync,
    onClearPageError: clearPageError,
  })

  const handleGenerateRevision = useCallback(async () => {
    if (!activeAttempt || generateRevisionMutation.isPending) return
    setPageError(null)

    try {
      await generateRevisionMutation.mutateAsync({
        attempt: activeAttempt,
      })
    } catch (err) {
      setPageError(
        err instanceof Error
          ? err.message
          : 'Failed to generate revision point.',
      )
    }
  }, [activeAttempt, generateRevisionMutation])

  const handleSignOut = useCallback(async () => {
    setPageError(null)
    await signOutUser()
  }, [signOutUser])

  const combinedError =
    pageError ??
    speechError ??
    voice.voiceError ??
    (processTurnMutation.error instanceof Error
      ? processTurnMutation.error.message
      : null) ??
    (generateRevisionMutation.error instanceof Error
      ? generateRevisionMutation.error.message
      : null)

  return {
    userEmail: user?.email ?? null,
    caseData,
    allFindings,
    attempts: existingList,
    attemptsLoading: attemptsQuery.isLoading,
    creatingAttempt: createAttemptMutation.isPending,
    generatingRevision: generateRevisionMutation.isPending,
    activeAttempt,
    typedInput,
    setTypedInput,
    voice,
    isBusy,
    combinedError,
    handleNewAttempt,
    handleSelectAttempt: selectAttempt,
    handleSignOut,
    handleTextSubmit,
    handleGenerateRevision,
  }
}
