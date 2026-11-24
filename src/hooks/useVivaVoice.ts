import { useCallback, useEffect, useRef, useState } from 'react'
import type { TurnPhase } from '../types/viva'

interface SpeechRecognitionAlternativeLike {
  transcript: string
}

interface SpeechRecognitionResultLike {
  isFinal: boolean
  0: SpeechRecognitionAlternativeLike
}

interface SpeechRecognitionEventLike {
  resultIndex: number
  results: ArrayLike<SpeechRecognitionResultLike>
}

interface SpeechRecognitionLike {
  lang: string
  interimResults: boolean
  continuous: boolean
  onresult: ((event: SpeechRecognitionEventLike) => void) | null
  onerror: ((event: { error: string }) => void) | null
  onend: (() => void) | null
  start: () => void
  stop: () => void
  abort: () => void
}

type SpeechRecognitionCtor = new () => SpeechRecognitionLike

function getSpeechRecognitionCtor(): SpeechRecognitionCtor | null {
  if (typeof window === 'undefined') return null
  const win = window as unknown as {
    SpeechRecognition?: SpeechRecognitionCtor
    webkitSpeechRecognition?: SpeechRecognitionCtor
  }
  return win.SpeechRecognition ?? win.webkitSpeechRecognition ?? null
}

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

  const isSttSupported = Boolean(getSpeechRecognitionCtor())
  const isTtsSupported =
    typeof window !== 'undefined' && 'speechSynthesis' in window

  const stopListening = useCallback(() => {
    try {
      recognitionRef.current?.stop()
    } catch {
      // Ignore stop errors if already stopped
    }
  }, [])

  const speakText = useCallback(
    (text: string, onDone?: () => void) => {
      setVoiceError(null)

      if (!isTtsSupported) {
        if (turnStartMsRef.current !== null) {
          setLastTurnMs(Math.round(performance.now() - turnStartMsRef.current))
          turnStartMsRef.current = null
        }
        setPhase('idle')
        onDone?.()
        return
      }

      stopListening()
      window.speechSynthesis.cancel()

      const utterance = new SpeechSynthesisUtterance(text)
      utterance.rate = 1.0
      utterance.pitch = 1.0

      utterance.onstart = () => {
        if (turnStartMsRef.current !== null) {
          setLastTurnMs(Math.round(performance.now() - turnStartMsRef.current))
          turnStartMsRef.current = null
        }
        setPhase('speaking')
      }

      utterance.onend = () => {
        setPhase('idle')
        onDone?.()
      }

      utterance.onerror = () => {
        setPhase('idle')
        onDone?.()
      }

      window.speechSynthesis.speak(utterance)
    },
    [isTtsSupported, stopListening],
  )

  const submitUtterance = useCallback(
    async (rawText: string) => {
      const cleaned = rawText.trim()
      if (!cleaned) {
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

    if (isTtsSupported) {
      window.speechSynthesis.cancel()
    }

    stopListening()
    transcriptBufferRef.current = ''
    setLiveTranscript('')
    setVoiceError(null)

    const recognition = new Ctor()
    recognition.lang = 'en-GB'
    recognition.interimResults = true
    recognition.continuous = false

    recognition.onresult = (event) => {
      let interim = ''
      let finalChunk = ''

      for (let i = event.resultIndex; i < event.results.length; i++) {
        const result = event.results[i]
        const piece = result[0].transcript
        if (result.isFinal) {
          finalChunk += piece
        } else {
          interim += piece
        }
      }

      if (finalChunk) {
        transcriptBufferRef.current =
          `${transcriptBufferRef.current} ${finalChunk}`.trim()
      }
      setLiveTranscript(`${transcriptBufferRef.current} ${interim}`.trim())
    }

    recognition.onerror = (event) => {
      if (event.error !== 'no-speech' && event.error !== 'aborted') {
        setVoiceError(`Microphone error: ${event.error}`)
      }
      setPhase('idle')
    }

    recognition.onend = () => {
      const spoken = transcriptBufferRef.current.trim()
      transcriptBufferRef.current = ''
      if (spoken) {
        void submitUtterance(spoken)
      } else {
        setPhase('idle')
      }
    }

    recognitionRef.current = recognition
    setPhase('listening')
    recognition.start()
  }, [isTtsSupported, stopListening, submitUtterance])

  useEffect(() => {
    return () => {
      stopListening()
      if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
        window.speechSynthesis.cancel()
      }
    }
  }, [stopListening])

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
