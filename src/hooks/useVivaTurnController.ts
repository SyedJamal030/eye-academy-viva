import { useCallback, useEffect, useRef, useState } from 'react'
import type { SubmitEvent } from 'react'
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

function isTypingElement(target: EventTarget | null): boolean {
  if (!(target instanceof HTMLElement)) return false
  const tag = target.tagName
  return (
    tag === 'INPUT' ||
    tag === 'TEXTAREA' ||
    tag === 'SELECT' ||
    target.isContentEditable
  )
}

export function useVivaTurnController({
  activeAttempt,
  isProcessingTurn,
  processTurn,
  onClearPageError,
}: UseVivaTurnControllerParams) {
  const [typedInput, setTypedInput] = useState('')
  const [speechError, setSpeechError] = useState<string | null>(null)
  const [autoListen, setAutoListen] = useState(false)

  const activeAttemptRef = useRef<VivaAttempt | null>(activeAttempt)
  const speakTextRef = useRef<((text: string) => void) | null>(null)
  const isSpaceHeldRef = useRef(false)
  const prevPhaseRef = useRef<'idle' | 'listening' | 'processing' | 'speaking'>(
    'idle',
  )

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

  const isBusy = voice.phase === 'processing' || isProcessingTurn

  // Push-to-Talk: Hold Spacebar outside text inputs to speak; release to send
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.code !== 'Space' || e.repeat || isTypingElement(e.target)) return
      if (!activeAttemptRef.current || isBusy) return

      if (voice.phase === 'idle') {
        e.preventDefault()
        isSpaceHeldRef.current = true
        voice.startListening()
      }
    }

    const handleKeyUp = (e: KeyboardEvent) => {
      if (e.code !== 'Space') return
      if (!isSpaceHeldRef.current) return

      isSpaceHeldRef.current = false
      if (voice.phase === 'listening') {
        e.preventDefault()
        voice.stopListening()
      }
    }

    const handleWindowBlur = () => {
      if (!isSpaceHeldRef.current) return
      isSpaceHeldRef.current = false
      if (voice.phase === 'listening') {
        voice.stopListening()
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    window.addEventListener('keyup', handleKeyUp)
    window.addEventListener('blur', handleWindowBlur)

    return () => {
      window.removeEventListener('keydown', handleKeyDown)
      window.removeEventListener('keyup', handleKeyUp)
      window.removeEventListener('blur', handleWindowBlur)
    }
  }, [isBusy, voice])

  // Optional Hands-Free Mode: Automatically resume listening after examiner finishes speaking
  useEffect(() => {
    const previousPhase = prevPhaseRef.current
    prevPhaseRef.current = voice.phase

    if (
      autoListen &&
      previousPhase === 'speaking' &&
      voice.phase === 'idle' &&
      !isBusy &&
      activeAttemptRef.current
    ) {
      const timer = window.setTimeout(() => {
        if (voice.phase === 'idle' && activeAttemptRef.current) {
          voice.startListening()
        }
      }, 250)

      return () => window.clearTimeout(timer)
    }
  }, [autoListen, isBusy, voice])

  const handleTextSubmit = useCallback(
    async (e: SubmitEvent<HTMLFormElement>) => {
      e.preventDefault()
      const trimmed = typedInput.trim()
      if (!trimmed || !activeAttemptRef.current) return
      setTypedInput('')
      setSpeechError(null)
      await voice.submitUtterance(trimmed)
    },
    [typedInput, voice],
  )

  return {
    typedInput,
    setTypedInput,
    speechError,
    isBusy,
    autoListen,
    setAutoListen,
    voice,
    handleTextSubmit,
  }
}
