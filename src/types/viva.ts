export type EyeSide = 'right' | 'left' | 'both' | null

export type TurnPhase = 'idle' | 'listening' | 'processing' | 'speaking'

export interface FindingItem {
  id: string
  eye: EyeSide
  label: string
  value: string | number | null
  unit: string | null
  method: string | null
  available: boolean
  unavailable_reason?: string
}

export interface VivaMessage {
  id: string
  role: 'examiner' | 'trainee'
  text: string
  spokenFollowUp?: string
  referencedFindingIds?: string[]
  createdAt: number
}

export interface CitedRevisionPoint {
  supported: boolean
  revisionPoint: string
  pageNumber: number | null
  excerpt: string | null
}

export interface VivaAttempt {
  id: string
  ownerUid: string
  caseId: string
  title: string
  status: 'in_progress' | 'completed'
  revealedFindingIds: string[]
  messages: VivaMessage[]
  revisionPoint?: CitedRevisionPoint | null
  createdAt: number
  updatedAt: number
}

export interface CasePatientProfile {
  age: number | string
  sex: string
  presenting_complaint: string
  past_ocular_history: string
  past_medical_history?: string
  medications: string[]
  allergies: string
  family_history: string
}

export interface VivaCaseData {
  case_id: string
  title: string
  opening_prompt: string
  patient: CasePatientProfile
  findings: FindingItem[]
}

export interface ExaminerNotes {
  diagnosis: string
  key_points: string[]
  follow_up_ideas: string[]
}

export interface FullCaseData extends VivaCaseData {
  fictional?: boolean
  disclaimer?: string
  examiner_notes: ExaminerNotes
}
