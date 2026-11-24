import { useCallback, useEffect, useRef, useState } from 'react'
import { useAuth } from '#/hooks/useAuth'
import type { VivaCaseData, VivaAttempt } from '#/types/viva'

interface CreateAttemptInput {
  caseId: string
  title: string
  openingPrompt: string
}

interface UseAttemptSelectionParams {
  caseData: VivaCaseData | null
  attempts: VivaAttempt[]
  isLoadingAttempts: boolean
  isCreatingAttempt: boolean
  createAttempt: (input: CreateAttemptInput) => Promise<VivaAttempt>
  onError: (message: string | null) => void
}

export function useAttemptSelection({
  caseData,
  attempts,
  isLoadingAttempts,
  isCreatingAttempt,
  createAttempt,
  onError,
}: UseAttemptSelectionParams) {
  const { user } = useAuth()
  const uid = user?.uid ?? null

  const [selectedAttemptId, setSelectedAttemptId] = useState<string | null>(
    null,
  )

  const initialCreationAttemptedForUidRef = useRef<string | null>(null)
  const creationInFlightRef = useRef(false)

  useEffect(() => {
    setSelectedAttemptId(null)
    if (!uid) {
      initialCreationAttemptedForUidRef.current = null
      creationInFlightRef.current = false
    }
  }, [uid])

  // Load the most recent (first) attempt unless the user explicitly selected one present in the list.
  const resolvedAttemptId =
    selectedAttemptId && attempts.some((a) => a.id === selectedAttemptId)
      ? selectedAttemptId
      : (attempts[0]?.id ?? null)

  const selectAttempt = useCallback(
    (attemptId: string) => {
      onError(null)
      setSelectedAttemptId(attemptId)
    },
    [onError],
  )

  const createInitialOrNewAttempt = useCallback(
    async (isInitialAutoCreate: boolean) => {
      if (
        !uid ||
        !caseData ||
        creationInFlightRef.current ||
        isCreatingAttempt
      ) {
        return null
      }
      creationInFlightRef.current = true
      if (!isInitialAutoCreate) {
        onError(null)
      }

      try {
        const created = await createAttempt({
          caseId: caseData.case_id,
          title: caseData.title,
          openingPrompt: caseData.opening_prompt,
        })
        setSelectedAttemptId(created.id)
        return created
      } catch (err) {
        if (isInitialAutoCreate) {
          // Allow a retry on subsequent renders or user action if initial auto-creation fails.
          initialCreationAttemptedForUidRef.current = null
        }
        onError(
          err instanceof Error
            ? err.message
            : isInitialAutoCreate
              ? 'Failed to create initial attempt.'
              : 'Failed to create a new attempt.',
        )
        return null
      } finally {
        creationInFlightRef.current = false
      }
    },
    [caseData, createAttempt, isCreatingAttempt, onError, uid],
  )

  useEffect(() => {
    if (!uid || !caseData || isLoadingAttempts || isCreatingAttempt) return
    if (attempts.length > 0) return
    if (initialCreationAttemptedForUidRef.current === uid) return
    if (creationInFlightRef.current) return

    initialCreationAttemptedForUidRef.current = uid
    void createInitialOrNewAttempt(true)
  }, [
    attempts.length,
    caseData,
    createInitialOrNewAttempt,
    isCreatingAttempt,
    isLoadingAttempts,
    uid,
  ])

  const handleNewAttempt = useCallback(async () => {
    await createInitialOrNewAttempt(false)
  }, [createInitialOrNewAttempt])

  return {
    resolvedAttemptId,
    selectAttempt,
    handleNewAttempt,
  }
}
