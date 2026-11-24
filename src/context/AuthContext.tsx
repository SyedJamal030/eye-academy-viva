import { useCallback, useEffect, useMemo, useState } from 'react'
import type { ReactNode } from 'react'
import { onAuthStateChanged, signOut } from 'firebase/auth'
import type { User } from 'firebase/auth'
import Container from 'react-bootstrap/Container'
import Spinner from 'react-bootstrap/Spinner'
import { AuthGate } from '#/components/AuthGate'
import { auth } from '#/lib/firebase'
import { AuthContext } from './auth'

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [authReady, setAuthReady] = useState(false)

  useEffect(() => {
    const unsub = onAuthStateChanged(
      auth,
      (currentUser) => {
        setUser(currentUser)
        setAuthReady(true)
      },
      () => {
        setUser(null)
        setAuthReady(true)
      },
    )

    return () => unsub()
  }, [])

  const signOutUser = useCallback(async () => {
    await signOut(auth)
  }, [])

  const contextValue = useMemo(
    () => ({ user, authReady, signOutUser }),
    [user, authReady, signOutUser],
  )

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
    <AuthContext.Provider value={contextValue}>{children}</AuthContext.Provider>
  )
}
