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
import { db } from './firebase'
import type {
  CitedRevisionPoint,
  VivaAttempt,
  VivaMessage,
} from '../types/viva'

const ATTEMPTS_COLLECTION = 'vivaAttempts'

export async function createVivaAttempt(params: {
  ownerUid: string
  caseId: string
  title: string
  openingPrompt: string
}): Promise<VivaAttempt> {
  const now = Date.now()
  const initialMessage: VivaMessage = {
    id: `msg_${now}`,
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
    .sort((a, b) => b.updatedAt - a.updatedAt)
}

export async function getAttemptById(
  attemptId: string,
  ownerUid: string,
): Promise<VivaAttempt | null> {
  const ref = doc(db, ATTEMPTS_COLLECTION, attemptId)
  const snap = await getDoc(ref)
  if (!snap.exists()) return null

  const data = snap.data() as Omit<VivaAttempt, 'id'>
  if (data.ownerUid !== ownerUid) {
    throw new Error('Unauthorized access to attempt')
  }

  return {
    id: snap.id,
    ...data,
  }
}

export async function appendTurnToAttempt(params: {
  attemptId: string
  newMessages: VivaMessage[]
  newFindingIds: string[]
}): Promise<void> {
  const ref = doc(db, ATTEMPTS_COLLECTION, params.attemptId)
  const updates: Record<string, unknown> = {
    updatedAt: Date.now(),
    serverUpdatedAt: serverTimestamp(),
  }

  if (params.newMessages.length > 0) {
    updates.messages = arrayUnion(...params.newMessages)
  }
  if (params.newFindingIds.length > 0) {
    updates.revealedFindingIds = arrayUnion(...params.newFindingIds)
  }

  await updateDoc(ref, updates)
}

export async function saveAttemptRevision(params: {
  attemptId: string
  revisionPoint: CitedRevisionPoint
  markCompleted?: boolean
}): Promise<void> {
  const ref = doc(db, ATTEMPTS_COLLECTION, params.attemptId)
  await updateDoc(ref, {
    revisionPoint: params.revisionPoint,
    status: params.markCompleted ? 'completed' : 'in_progress',
    updatedAt: Date.now(),
    serverUpdatedAt: serverTimestamp(),
  })
}
