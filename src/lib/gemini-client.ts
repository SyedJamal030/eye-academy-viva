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
