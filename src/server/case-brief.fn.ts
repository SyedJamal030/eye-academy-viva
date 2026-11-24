import { createServerFn } from '@tanstack/react-start'
import rawCaseData from '#/data/case-ea-viva-001.json'
import type { FullCaseData, VivaCaseData } from '#/types/viva'

const SERVER_CASE = rawCaseData as FullCaseData

export const getPublicCaseBriefFn = createServerFn({ method: 'GET' }).handler(
  async (): Promise<VivaCaseData> => {
    return {
      case_id: SERVER_CASE.case_id,
      title: SERVER_CASE.title,
      opening_prompt: SERVER_CASE.opening_prompt,
      patient: SERVER_CASE.patient,
      findings: SERVER_CASE.findings,
    }
  },
)
