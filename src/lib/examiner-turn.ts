import { GoogleGenAI, Type } from '@google/genai'
import caseData from '../data/case-ea-viva-001.json'
import {
  findMatchingFindings,
  formatFindingForDisplayAndSpeech,
} from './findings'
import type { FindingItem, VivaMessage } from '../types/viva'

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY })

export interface ExaminerTurnResult {
  matchedFindings: FindingItem[]
  findingReadouts: string[]
  followUpQuestion: string
  spokenResponse: string
}

export async function generateExaminerTurn(params: {
  traineeUtterance: string
  recentMessages: VivaMessage[]
}): Promise<ExaminerTurnResult> {
  const matchedFindings = findMatchingFindings(params.traineeUtterance)
  const formatted = matchedFindings.map(formatFindingForDisplayAndSpeech)
  const findingReadouts = formatted.map((f) => f.spokenText)

  const deterministicFindingsBlock =
    findingReadouts.length > 0
      ? findingReadouts.map((line, idx) => `${idx + 1}. ${line}`).join('\n')
      : 'None requested or matched in this turn.'

  const historyBlock = params.recentMessages
    .slice(-6)
    .map((m) => `${m.role.toUpperCase()}: ${m.text}`)
    .join('\n')

  const prompt = `
You are an ophthalmology oral exam (viva) examiner conducting practice case EA-VIVA-001.

CASE CONTEXT (Reference Only):
- Opening prompt: ${caseData.opening_prompt}
- Examiner diagnosis note: ${caseData.examiner_notes.diagnosis}
- Key clinical points: ${caseData.examiner_notes.key_points.join('; ')}
- Suggested follow-up angles: ${caseData.examiner_notes.follow_up_ideas.join('; ')}

CONVERSATION SO FAR:
${historyBlock}

TRAINEE'S LATEST UTTERANCE:
"${params.traineeUtterance}"

DETERMINISTIC CASE FINDINGS FOR THIS TURN (AUTHORITATIVE):
${deterministicFindingsBlock}

INSTRUCTIONS:
1. Never invent, alter, or guess any clinical value, unit, eye side, or availability status.
2. If deterministic findings were matched, accurately reflect every one of them in your response (including stating clearly when a finding is unavailable and why).
3. Ask ONLY ONE concise, natural spoken follow-up question that directly responds to what the trainee just said or asked. Do not ask two questions in one turn.
4. Combine the finding readout and the single follow-up question cleanly in "spokenResponse".
`.trim()

  const response = await ai.models.generateContent({
    model: 'gemini-2.5-flash',
    contents: prompt,
    config: {
      responseMimeType: 'application/json',
      responseSchema: {
        type: Type.OBJECT,
        properties: {
          followUpQuestion: {
            type: Type.STRING,
            description:
              'Exactly one concise follow-up question tied to what the trainee said.',
          },
          spokenResponse: {
            type: Type.STRING,
            description:
              'Complete examiner response reading back any matched findings plus the single follow-up question.',
          },
        },
        required: ['followUpQuestion', 'spokenResponse'],
      },
    },
  })

  const rawText = response.text
  if (!rawText) {
    const fallbackFollowUp =
      'What is your working diagnosis and what are your immediate management priorities for this patient?'
    const fallbackSpoken =
      findingReadouts.length > 0
        ? `${findingReadouts.join(' ')} ${fallbackFollowUp}`
        : fallbackFollowUp

    return {
      matchedFindings,
      findingReadouts,
      followUpQuestion: fallbackFollowUp,
      spokenResponse: fallbackSpoken,
    }
  }

  const parsed = JSON.parse(rawText) as {
    followUpQuestion: string
    spokenResponse: string
  }

  const ensuredSpoken =
    findingReadouts.length > 0 &&
    !findingReadouts.every((r) =>
      parsed.spokenResponse
        .toLowerCase()
        .includes(r.slice(0, 18).toLowerCase()),
    )
      ? `${findingReadouts.join(' ')} ${parsed.followUpQuestion}`.trim()
      : parsed.spokenResponse.trim()

  return {
    matchedFindings,
    findingReadouts,
    followUpQuestion: parsed.followUpQuestion.trim(),
    spokenResponse: ensuredSpoken,
  }
}
