import { createRemoteJWKSet, jwtVerify } from 'jose'

const FIREBASE_JWKS_URL = new URL(
  'https://www.googleapis.com/service_accounts/v1/jwk/securetoken@system.gserviceaccount.com',
)

const jwks = createRemoteJWKSet(FIREBASE_JWKS_URL)

export interface VerifiedFirebaseUser {
  uid: string
  email: string | null
}

function resolveFirebaseProjectId(): string {
  const projectId =
    process.env.FIREBASE_PROJECT_ID || process.env.VITE_FIREBASE_PROJECT_ID
  if (!projectId || !projectId.trim()) {
    throw new Error(
      'Server configuration error: FIREBASE_PROJECT_ID is not set.',
    )
  }
  return projectId.trim()
}

export async function verifyFirebaseIdToken(
  idToken: string | undefined | null,
): Promise<VerifiedFirebaseUser> {
  if (!idToken || !idToken.trim()) {
    throw new Error('Unauthorized: Missing Firebase ID token.')
  }

  const projectId = resolveFirebaseProjectId()
  const issuer = `https://securetoken.google.com/${projectId}`

  const { payload } = await jwtVerify(idToken.trim(), jwks, {
    audience: projectId,
    issuer,
  })

  const uid = typeof payload.sub === 'string' ? payload.sub.trim() : ''
  if (!uid) {
    throw new Error('Unauthorized: Token subject (uid) is missing.')
  }

  return {
    uid,
    email: typeof payload.email === 'string' ? payload.email : null,
  }
}
