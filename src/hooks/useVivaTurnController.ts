import { useCallback, useEffect, useRef, useState } from 'react'
import { useVivaVoice } from '#/hooks/useVivaVoice'
import type { VivaAttempt } from '#/types/viva'

interface ProcessTurnResult {
  spokenResponse: string
}

interface UseVivaTurnControllerParams {
  activeAttempt: VivaAttempt | null
  isProcessingTurn: boolean
  processTurn: (input: {
    attempt: VivaAttempt
    transcript: string
  }) => Promise<ProcessTurnResult>
  onClearPageError: () => void
}

export function useVivaTurnController({
  activeAttempt,
  isProcessingTurn,
  processTurn,
  onClearPageError,
}: UseVivaTurnControllerParams) {
  const [typedInput, setTypedInput] = useState('')
  const [speechError, setSpeechError] = useState<string | null>(null)

  const activeAttemptRef = useRef<VivaAttempt | null>(activeAttempt)
  const speakTextRef = useRef<((text: string) => void) | null>(null)

  useEffect(() => {
    activeAttemptRef.current = activeAttempt
  }, [activeAttempt])

  const handleFinalTranscript = useCallback(
    async (transcript: string) => {
      const attemptSnapshot = activeAttemptRef.current
      if (!attemptSnapshot) return
      onClearPageError()
      setSpeechError(null)

      const { spokenResponse } = await processTurn({
        attempt: attemptSnapshot,
        transcript,
      })

      try {
        speakTextRef.current?.(spokenResponse)
      } catch (err) {
        setSpeechError(
          err instanceof Error
            ? err.message
            : 'Unable to play spoken examiner response.',
        )
      }
    },
    [onClearPageError, processTurn],
  )

  const voice = useVivaVoice({
    onFinalTranscript: handleFinalTranscript,
  })

  useEffect(() => {
    speakTextRef.current = voice.speakText
  }, [voice.speakText])

  const handleTextSubmit = useCallback(
    async (e: React.SubmitEvent<HTMLFormElement>) => {
      e.preventDefault()
      const trimmed = typedInput.trim()
      if (!trimmed || !activeAttemptRef.current) return
      setTypedInput('')
      setSpeechError(null)
      await voice.submitUtterance(trimmed)
    },
    [typedInput, voice],
  )

  const isBusy = voice.phase === 'processing' || isProcessingTurn

  return {
    typedInput,
    setTypedInput,
    speechError,
    isBusy,
    voice,
    handleTextSubmit,
  }
}
