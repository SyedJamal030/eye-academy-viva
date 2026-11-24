import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import {
  appendTranscriptChunks,
  cancelSpeechSynthesis,
  getSpeechRecognitionCtor,
  isSpeechSynthesisSupported,
  safeStopRecognition,
} from '#/lib/speech-adapter'
import type { TurnPhase } from '#/types/viva'
import type { SpeechRecognitionLike } from '#/types/speech'

export function useVivaVoice(params: {
  onFinalTranscript: (
    transcript: string,
    finalizedAtMs: number,
  ) => Promise<void> | void
}) {
  const [phase, setPhase] = useState<TurnPhase>('idle')
  const [liveTranscript, setLiveTranscript] = useState('')
  const [voiceError, setVoiceError] = useState<string | null>(null)
  const [lastTurnMs, setLastTurnMs] = useState<number | null>(null)

  const recognitionRef = useRef<SpeechRecognitionLike | null>(null)
  const transcriptBufferRef = useRef('')
  const turnStartMsRef = useRef<number | null>(null)
  const onFinalTranscriptRef = useRef(params.onFinalTranscript)
  onFinalTranscriptRef.current = params.onFinalTranscript

  const isSttSupported = useMemo(() => Boolean(getSpeechRecognitionCtor()), [])
  const isTtsSupported = useMemo(() => isSpeechSynthesisSupported(), [])

  const recordTurnLatencyIfPending = useCallback(() => {
    if (turnStartMsRef.current !== null) {
      setLastTurnMs(Math.round(performance.now() - turnStartMsRef.current))
      turnStartMsRef.current = null
    }
  }, [])

  const stopListening = useCallback(() => {
    safeStopRecognition(recognitionRef.current)
  }, [])

  const speakText = useCallback(
    (text: string, onDone?: () => void) => {
      setVoiceError(null)

      if (!isTtsSupported || !text.trim()) {
        recordTurnLatencyIfPending()
        setPhase('idle')
        onDone?.()
        return
      }

      stopListening()
      cancelSpeechSynthesis()

      try {
        const utterance = new SpeechSynthesisUtterance(text)
        utterance.rate = 1.0
        utterance.pitch = 1.0

        utterance.onstart = () => {
          recordTurnLatencyIfPending()
          setPhase('speaking')
        }

        utterance.onend = () => {
          setPhase('idle')
          onDone?.()
        }

        utterance.onerror = () => {
          recordTurnLatencyIfPending()
          setPhase('idle')
          setVoiceError('Unable to play examiner audio response.')
          onDone?.()
        }

        window.speechSynthesis.speak(utterance)
      } catch (err) {
        recordTurnLatencyIfPending()
        setPhase('idle')
        setVoiceError(
          err instanceof Error
            ? err.message
            : 'Speech synthesis failed to start.',
        )
        onDone?.()
      }
    },
    [isTtsSupported, recordTurnLatencyIfPending, stopListening],
  )

  const submitUtterance = useCallback(
    async (rawText: string) => {
      const cleaned = rawText.trim()
      if (!cleaned) {
        turnStartMsRef.current = null
        setPhase('idle')
        return
      }

      stopListening()
      setLiveTranscript('')
      setVoiceError(null)
      setPhase('processing')
      turnStartMsRef.current = performance.now()

      try {
        await onFinalTranscriptRef.current(cleaned, performance.now())
      } catch (err) {
        turnStartMsRef.current = null
        setPhase('idle')
        setVoiceError(
          err instanceof Error ? err.message : 'Failed to process turn.',
        )
      }
    },
    [stopListening],
  )

  const startListening = useCallback(() => {
    const Ctor = getSpeechRecognitionCtor()
    if (!Ctor) {
      setVoiceError(
        'Browser speech recognition is not supported here. Use the text box to submit your question.',
      )
      return
    }

    cancelSpeechSynthesis()
    stopListening()
    transcriptBufferRef.current = ''
    setLiveTranscript('')
    setVoiceError(null)

    const recognition = new Ctor()
    recognition.lang = 'en-GB'
    recognition.interimResults = true
    recognition.continuous = false

    recognition.onresult = (event) => {
      const { nextFinal, previewText } = appendTranscriptChunks(
        transcriptBufferRef.current,
        event,
      )
      transcriptBufferRef.current = nextFinal
      setLiveTranscript(previewText)
    }

    recognition.onerror = (event) => {
      if (recognitionRef.current === recognition) {
        recognitionRef.current = null
      }
      if (event.error !== 'no-speech' && event.error !== 'aborted') {
        setVoiceError(`Microphone error: ${event.error}`)
      }
      setPhase('idle')
    }

    recognition.onend = () => {
      if (recognitionRef.current === recognition) {
        recognitionRef.current = null
      }
      const spoken = transcriptBufferRef.current.trim()
      transcriptBufferRef.current = ''
      if (spoken) {
        void submitUtterance(spoken)
      } else {
        setPhase('idle')
      }
    }

    recognitionRef.current = recognition
    try {
      setPhase('listening')
      recognition.start()
    } catch (err) {
      if (recognitionRef.current === recognition) {
        recognitionRef.current = null
      }
      setPhase('idle')
      setVoiceError(
        err instanceof Error
          ? err.message
          : 'Could not start microphone listening.',
      )
    }
  }, [stopListening, submitUtterance])

  useEffect(() => {
    return () => {
      safeStopRecognition(recognitionRef.current)
      recognitionRef.current = null
      cancelSpeechSynthesis()
    }
  }, [])

  return {
    phase,
    setPhase,
    liveTranscript,
    voiceError,
    lastTurnMs,
    isSttSupported,
    isTtsSupported,
    startListening,
    stopListening,
    submitUtterance,
    speakText,
  }
}
