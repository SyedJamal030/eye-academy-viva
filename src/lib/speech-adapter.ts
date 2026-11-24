import type {
  SpeechRecognitionCtor,
  SpeechRecognitionEventLike,
  SpeechRecognitionLike,
} from '#/types/speech'

export function getSpeechRecognitionCtor(): SpeechRecognitionCtor | null {
  if (typeof window === 'undefined') return null
  const win = window as unknown as {
    SpeechRecognition?: SpeechRecognitionCtor
    webkitSpeechRecognition?: SpeechRecognitionCtor
  }
  return win.SpeechRecognition ?? win.webkitSpeechRecognition ?? null
}

export function isSpeechSynthesisSupported(): boolean {
  return typeof window !== 'undefined' && 'speechSynthesis' in window
}

export function appendTranscriptChunks(
  existingFinal: string,
  event: SpeechRecognitionEventLike,
): { nextFinal: string; previewText: string } {
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

  const nextFinal = finalChunk
    ? `${existingFinal} ${finalChunk}`.trim()
    : existingFinal
  const previewText = `${nextFinal} ${interim}`.trim()

  return { nextFinal, previewText }
}

export function safeStopRecognition(
  recognition: SpeechRecognitionLike | null,
): void {
  if (!recognition) return
  try {
    recognition.stop()
  } catch {
    // Recognition may already be stopped or inactive.
  }
}

export function cancelSpeechSynthesis(): void {
  if (!isSpeechSynthesisSupported()) return
  try {
    window.speechSynthesis.cancel()
  } catch {
    // Ignore synthesis cancellation errors during teardown.
  }
}
