import { GoogleGenAI } from '@google/genai'

export function createGeminiClient(apiKey?: string): GoogleGenAI {
  const resolvedKey = apiKey ?? process.env.GEMINI_API_KEY
  if (!resolvedKey || !resolvedKey.trim()) {
    throw new Error('GEMINI_API_KEY is not configured.')
  }
  return new GoogleGenAI({ apiKey: resolvedKey })
}

export function parseJsonSafe<T>(rawText: string | undefined | null): T | null {
  if (!rawText || !rawText.trim()) return null
  try {
    return JSON.parse(rawText) as T
  } catch {
    return null
  }
}

function isTransientGeminiError(err: unknown): boolean {
  const message =
    err instanceof Error
      ? err.message
      : typeof err === 'string'
        ? err
        : JSON.stringify(err ?? '')
  return (
    /\b503\b/.test(message) ||
    /UNAVAILABLE/i.test(message) ||
    /\b429\b/.test(message) ||
    /RESOURCE_EXHAUSTED/i.test(message) ||
    /overloaded|high demand|temporarily unavailable/i.test(message)
  )
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

function summarizeError(err: unknown): string {
  if (err instanceof Error) return err.message
  if (typeof err === 'string') return err
  try {
    return JSON.stringify(err)
  } catch {
    return 'Unknown error'
  }
}

export async function generateContentWithRetry(
  ai: GoogleGenAI,
  params: Parameters<GoogleGenAI['models']['generateContent']>[0],
  options?: {
    fallbackModel?: string
    maxRetriesPerModel?: number
  },
) {
  const primaryModel = params.model
  const fallbackModel = options?.fallbackModel
  const maxRetries = options?.maxRetriesPerModel ?? 0

  const modelsToTry = Array.from(
    new Set(
      [
        primaryModel,
        fallbackModel,
        'gemini-3.5-flash',
        'gemini-3.8-flash',
        'gemini-3.1-flash-lite',
      ].filter((model): model is string => Boolean(model && model.trim())),
    ),
  )

  const attemptedModels: string[] = []
  const failures: Array<{ model: string; attempt: number; reason: string }> = []
  let lastError: unknown

  for (const model of modelsToTry) {
    attemptedModels.push(model)

    for (let attempt = 0; attempt <= maxRetries; attempt++) {
      try {
        const response = await ai.models.generateContent({
          ...params,
          model,
        })

        console.warn(
          `[gemini] Responded on model "${model}" (attempt ${attempt + 1}/${maxRetries + 1}). Tried: ${attemptedModels.join(' -> ')}`,
        )
        return response
      } catch (err) {
        lastError = err
        const reason = summarizeError(err)
        failures.push({ model, attempt: attempt + 1, reason })

        console.warn(
          `[gemini] Model "${model}" failed on attempt ${attempt + 1}/${maxRetries + 1}: ${reason}`,
        )

        if (!isTransientGeminiError(err)) {
          console.error(
            `[gemini] Non-transient error on "${model}". Tried: ${attemptedModels.join(' -> ')}`,
          )
          throw err
        }

        if (attempt < maxRetries) {
          await sleep(400 * (attempt + 1))
        }
      }
    }
  }

  console.error(
    `[gemini] Exhausted all models (${attemptedModels.join(' -> ')}). Failures: ${JSON.stringify(failures)}`,
  )

  if (lastError instanceof Error) {
    lastError.message = `${lastError.message} [Tried models: ${attemptedModels.join(', ')}]`
    throw lastError
  }

  throw new Error(
    `All Gemini models failed (${attemptedModels.join(', ')}): ${summarizeError(lastError)}`,
  )
}
