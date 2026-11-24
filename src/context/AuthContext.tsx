import { useCallback, useEffect, useState } from 'react'
import type { ReactNode } from 'react'
import { onAuthStateChanged, signOut } from 'firebase/auth'
import type { User } from 'firebase/auth'
import { auth } from '../lib/firebase'
import { AuthContext } from './auth'
import { AuthGate } from '#/components/AuthGate'
import Container from 'react-bootstrap/esm/Container'
import Spinner from 'react-bootstrap/esm/Spinner'

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [authReady, setAuthReady] = useState(false)

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser)
      setAuthReady(true)
    })

    return () => unsub()
  }, [])

  const signOutUser = useCallback(async () => {
    await signOut(auth)
  }, [])

  if (!authReady) {
    return (
      <Container
        fluid
        className="min-vh-100 d-flex align-items-center justify-content-center gap-2 bg-light small text-secondary"
      >
        <Spinner animation="border" size="sm" role="status" />
        <span>Checking session...</span>
      </Container>
    )
  }

  if (!user) {
    return <AuthGate />
  }

  return (
    <AuthContext.Provider value={{ user, authReady, signOutUser }}>
      {children}
    </AuthContext.Provider>
  )
}
