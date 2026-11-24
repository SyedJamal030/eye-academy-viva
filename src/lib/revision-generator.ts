import { GoogleGenAI, Type } from '@google/genai'
import referencePages from '../data/glaucoma-reference-pages.json'
import type { CitedRevisionPoint, VivaMessage } from '../types/viva'

export interface ReferencePageDoc {
  page: number
  text: string
}

export interface RetrievedPageCandidate {
  page: number
  score: number
  text: string
}

const PAGES = referencePages as ReferencePageDoc[]
const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY })

const STOP_WORDS = new Set([
  'with',
  'from',
  'that',
  'this',
  'have',
  'what',
  'when',
  'where',
  'which',
  'would',
  'could',
  'should',
  'about',
  'into',
  'your',
  'they',
  'them',
  'there',
  'their',
  'because',
  'given',
  'patient',
  'right',
  'left',
  'eye',
])

export function retrieveRelevantPages(
  queryText: string,
  topK = 3,
): RetrievedPageCandidate[] {
  const tokens = queryText
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, ' ')
    .split(/\s+/)
    .filter((t) => t.length >= 3 && !STOP_WORDS.has(t))

  return PAGES.map((doc) => {
    const lower = doc.text.toLowerCase()
    let score = 0

    for (const token of tokens) {
      const escaped = token.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
      const matches = lower.match(new RegExp(`\\b${escaped}`, 'g'))
      if (matches) score += matches.length
    }

    // Light boost for acute angle closure & iridotomy pages relevant to EA-VIVA-001
    if (doc.page >= 3 && doc.page <= 7) {
      score += 1.5
    }

    return {
      page: doc.page,
      score,
      text: doc.text,
    }
  })
    .sort((a, b) => b.score - a.score || a.page - b.page)
    .slice(0, topK)
}

function normalizeForMatch(input: string): string {
  return input.toLowerCase().replace(/\s+/g, ' ').trim()
}

export async function generateCitedRevisionPoint(params: {
  messages: VivaMessage[]
}): Promise<{
  revision: CitedRevisionPoint
  retrievedPages: number[]
}> {
  const traineeTurns = params.messages
    .filter((m) => m.role === 'trainee')
    .map((m) => m.text)
    .join('\n')

  const combinedContextText =
    traineeTurns.trim().length > 0
      ? traineeTurns
      : params.messages.map((m) => m.text).join('\n')

  const candidates = retrieveRelevantPages(combinedContextText, 3)
  const retrievedPages = candidates.map((c) => c.page)

  const pagesPayload = candidates
    .map((c) => `--- PAGE ${c.page} ---\n${c.text}`)
    .join('\n\n')

  const prompt = `
You are reviewing a trainee's ophthalmology viva responses and producing ONE revision point using ONLY the provided reference note pages.

TRAINEE ANSWERS / TRANSCRIPT:
${combinedContextText}

RETRIEVED REFERENCE NOTE PAGES:
${pagesPayload}

RULES:
1. Base the revision point on what the trainee said (or missed in their stated reasoning).
2. Produce ONLY ONE concise revision point.
3. If the provided reference pages support a clear revision point for the trainee's answer, set supported=true, set pageNumber to the exact page number (from the retrieved pages above), and copy a short verbatim excerpt (1 to 2 sentences, under 220 characters) directly from that page.
4. If the provided reference pages do NOT support a revision point for what the trainee said, set supported=false, pageNumber=null, excerpt=null, and explain in revisionPoint that the reference note does not support this point.
5. Never invent a page number or paraphrase an excerpt as a quote.
`.trim()

  const response = await ai.models.generateContent({
    model: 'gemini-2.5-flash',
    contents: prompt,
    config: {
      responseMimeType: 'application/json',
      responseSchema: {
        type: Type.OBJECT,
        properties: {
          supported: { type: Type.BOOLEAN },
          revisionPoint: { type: Type.STRING },
          pageNumber: { type: Type.INTEGER, nullable: true },
          excerpt: { type: Type.STRING, nullable: true },
        },
        required: ['supported', 'revisionPoint', 'pageNumber', 'excerpt'],
      },
    },
  })

  const rawText = response.text
  if (!rawText) {
    return {
      retrievedPages,
      revision: {
        supported: false,
        revisionPoint:
          'Unable to generate a supported revision point from the reference note at this time.',
        pageNumber: null,
        excerpt: null,
      },
    }
  }

  const parsed = JSON.parse(rawText) as CitedRevisionPoint

  if (!parsed.supported || parsed.pageNumber === null || !parsed.excerpt) {
    return {
      retrievedPages,
      revision: {
        supported: false,
        revisionPoint:
          parsed.revisionPoint ||
          'The provided passages from the reference note do not support a specific revision point for this answer.',
        pageNumber: null,
        excerpt: null,
      },
    }
  }

  const matchedPage = candidates.find((c) => c.page === parsed.pageNumber)
  const excerptMatchesPage =
    matchedPage !== undefined &&
    normalizeForMatch(matchedPage.text).includes(
      normalizeForMatch(parsed.excerpt),
    )

  if (!matchedPage || !excerptMatchesPage) {
    return {
      retrievedPages,
      revision: {
        supported: false,
        revisionPoint:
          'The reference note does not provide a verified supporting excerpt for that claim on the cited page.',
        pageNumber: null,
        excerpt: null,
      },
    }
  }

  return {
    retrievedPages,
    revision: {
      supported: true,
      revisionPoint: parsed.revisionPoint.trim(),
      pageNumber: matchedPage.page,
      excerpt: parsed.excerpt.trim(),
    },
  }
}
