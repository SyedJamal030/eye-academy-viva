import { useCallback, useState } from 'react'
import type { SubmitEvent } from 'react'
import { FirebaseError } from 'firebase/app'
import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
} from 'firebase/auth'
import Alert from 'react-bootstrap/Alert'
import Button from 'react-bootstrap/Button'
import Card from 'react-bootstrap/Card'
import Container from 'react-bootstrap/Container'
import Form from 'react-bootstrap/Form'
import { auth } from '../lib/firebase'

function formatAuthError(err: unknown): string {
  if (err instanceof FirebaseError) {
    switch (err.code) {
      case 'auth/invalid-credential':
      case 'auth/user-not-found':
      case 'auth/wrong-password':
        return 'Invalid email or password.'
      case 'auth/email-already-in-use':
        return 'An account with this email already exists.'
      case 'auth/weak-password':
        return 'Password must be at least 6 characters.'
      case 'auth/too-many-requests':
        return 'Too many attempts. Please try again later.'
      default:
        return err.message
    }
  }
  return err instanceof Error ? err.message : 'Authentication failed.'
}

export function AuthGate() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [isSignUp, setIsSignUp] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)

  const handleSubmit = useCallback(async (e: SubmitEvent<HTMLFormElement>) => {
    e.preventDefault()
    setError(null)
    setSubmitting(true)

    try {
      if (isSignUp) {
        await createUserWithEmailAndPassword(auth, email.trim(), password)
      } else {
        await signInWithEmailAndPassword(auth, email.trim(), password)
      }
    } catch (err) {
      setError(formatAuthError(err))
    } finally {
      setSubmitting(false)
    }
  }, [])

  return (
    <Container
      fluid
      className="min-vh-100 d-flex align-items-center justify-content-center bg-light p-4"
    >
      <Card className="w-100 shadow-sm border" style={{ maxWidth: '28rem' }}>
        <Card.Body className="p-4">
          <div className="text-uppercase fw-semibold text-secondary small">
            Eye Academy · Voice Viva
          </div>
          <Card.Title as="h1" className="mt-1 fs-5 fw-semibold text-dark">
            {isSignUp
              ? 'Create trainee account'
              : 'Sign in to start practice viva'}
          </Card.Title>
          <Card.Text className="mt-1 small text-secondary">
            Your saved attempts, transcript, and revealed findings stay private
            to your account.
          </Card.Text>

          <Form onSubmit={handleSubmit} className="mt-4">
            <Form.Group className="mb-3" controlId="authEmail">
              <Form.Label className="small fw-medium">Email</Form.Label>
              <Form.Control
                type="email"
                required
                autoComplete="email"
                disabled={submitting}
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="trainee@example.com"
              />
            </Form.Group>

            <Form.Group className="mb-3" controlId="authPassword">
              <Form.Label className="small fw-medium">Password</Form.Label>
              <Form.Control
                type="password"
                required
                minLength={6}
                autoComplete={isSignUp ? 'new-password' : 'current-password'}
                disabled={submitting}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="At least 6 characters"
              />
            </Form.Group>

            {error && (
              <Alert variant="danger" className="py-2 px-3 small">
                {error}
              </Alert>
            )}

            <Button
              type="submit"
              variant="dark"
              disabled={submitting}
              className="w-100"
            >
              {submitting
                ? 'Please wait...'
                : isSignUp
                  ? 'Create Account'
                  : 'Sign In'}
            </Button>
          </Form>

          <div className="mt-3 text-center">
            <Button
              type="button"
              variant="link"
              size="sm"
              disabled={submitting}
              className="text-decoration-none text-secondary p-0"
              onClick={() => {
                setIsSignUp((prev) => !prev)
                setError(null)
              }}
            >
              {isSignUp
                ? 'Already have an account? Sign in'
                : 'Need an account? Create one'}
            </Button>
          </div>
        </Card.Body>
      </Card>
    </Container>
  )
}
