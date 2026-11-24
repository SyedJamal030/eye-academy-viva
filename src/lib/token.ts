import { auth } from './firebase'

export async function getRequiredIdToken(): Promise<string> {
  const currentUser = auth.currentUser
  if (!currentUser) {
    throw new Error('You must be signed in to continue.')
  }
  return currentUser.getIdToken()
}
