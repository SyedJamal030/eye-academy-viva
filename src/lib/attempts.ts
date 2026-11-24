import {
  addDoc,
  arrayUnion,
  collection,
  doc,
  getDoc,
  getDocs,
  query,
  serverTimestamp,
  updateDoc,
  where,
} from 'firebase/firestore'
import type { CitedRevisionPoint, VivaAttempt, VivaMessage } from '#/types/viva'
import { db } from './firebase'

const ATTEMPTS_COLLECTION = 'vivaAttempts'

let idSequence = 0
function createUniqueId(prefix: string, timestampMs: number): string {
  idSequence = (idSequence + 1) % 1_000_000
  return `${prefix}_${timestampMs}_${idSequence}`
}

function toSafeTimestamp(value: unknown): number {
  return typeof value === 'number' && Number.isFinite(value) ? value : 0
}

async function assertAttemptOwner(
  attemptId: string,
  ownerUid: string,
): Promise<void> {
  if (!ownerUid.trim()) {
    throw new Error('Authentication required to modify viva attempt.')
  }
  if (!attemptId.trim()) {
    throw new Error('Attempt ID is required.')
  }

  const ref = doc(db, ATTEMPTS_COLLECTION, attemptId)
  const snap = await getDoc(ref)
  if (!snap.exists()) {
    throw new Error('Viva attempt not found.')
  }

  const data = snap.data() as Partial<VivaAttempt>
  if (data.ownerUid !== ownerUid) {
    throw new Error('Unauthorized access to attempt.')
  }
}

export async function createVivaAttempt(params: {
  ownerUid: string
  caseId: string
  title: string
  openingPrompt: string
}): Promise<VivaAttempt> {
  if (!params.ownerUid.trim()) {
    throw new Error('Must be signed in to create an attempt.')
  }

  const now = Date.now()
  const initialMessage: VivaMessage = {
    id: createUniqueId('msg', now),
    role: 'examiner',
    text: params.openingPrompt,
    createdAt: now,
  }

  const payload = {
    ownerUid: params.ownerUid,
    caseId: params.caseId,
    title: params.title,
    status: 'in_progress' as const,
    revealedFindingIds: [] as string[],
    messages: [initialMessage],
    revisionPoint: null,
    createdAt: now,
    updatedAt: now,
    serverUpdatedAt: serverTimestamp(),
  }

  const ref = await addDoc(collection(db, ATTEMPTS_COLLECTION), payload)
  return {
    id: ref.id,
    ...payload,
  }
}

export async function listUserAttempts(
  ownerUid: string,
): Promise<VivaAttempt[]> {
  if (!ownerUid.trim()) return []

  const q = query(
    collection(db, ATTEMPTS_COLLECTION),
    where('ownerUid', '==', ownerUid),
  )
  const snapshot = await getDocs(q)

  return snapshot.docs
    .map((d) => ({
      id: d.id,
      ...(d.data() as Omit<VivaAttempt, 'id'>),
    }))
    .sort((a, b) => toSafeTimestamp(b.updatedAt) - toSafeTimestamp(a.updatedAt))
}

export async function getAttemptById(
  attemptId: string,
  ownerUid: string,
): Promise<VivaAttempt | null> {
  if (!ownerUid.trim() || !attemptId.trim()) return null

  const ref = doc(db, ATTEMPTS_COLLECTION, attemptId)
  const snap = await getDoc(ref)
  if (!snap.exists()) return null

  const data = snap.data() as Omit<VivaAttempt, 'id'>
  if (data.ownerUid !== ownerUid) {
    throw new Error('Unauthorized access to attempt.')
  }

  return {
    id: snap.id,
    ...data,
  }
}

export async function appendTurnToAttempt(params: {
  attemptId: string
  ownerUid: string
  newMessages: VivaMessage[]
  newFindingIds: string[]
  updatedAt?: number
}): Promise<number> {
  await assertAttemptOwner(params.attemptId, params.ownerUid)

  const timestampMs = params.updatedAt ?? Date.now()
  const ref = doc(db, ATTEMPTS_COLLECTION, params.attemptId)
  const updates: Record<string, unknown> = {
    updatedAt: timestampMs,
    serverUpdatedAt: serverTimestamp(),
  }

  if (params.newMessages.length > 0) {
    updates.messages = arrayUnion(...params.newMessages)
  }
  if (params.newFindingIds.length > 0) {
    updates.revealedFindingIds = arrayUnion(...params.newFindingIds)
  }

  await updateDoc(ref, updates)
  return timestampMs
}

export async function saveAttemptRevision(params: {
  attemptId: string
  ownerUid: string
  revisionPoint: CitedRevisionPoint
  markCompleted?: boolean
  updatedAt?: number
}): Promise<number> {
  await assertAttemptOwner(params.attemptId, params.ownerUid)

  const timestampMs = params.updatedAt ?? Date.now()
  const ref = doc(db, ATTEMPTS_COLLECTION, params.attemptId)
  await updateDoc(ref, {
    revisionPoint: params.revisionPoint,
    status: params.markCompleted ? 'completed' : 'in_progress',
    updatedAt: timestampMs,
    serverUpdatedAt: serverTimestamp(),
  })
  return timestampMs
}

export { createUniqueId }
