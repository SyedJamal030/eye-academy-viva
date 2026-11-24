import { useRef, useState } from 'react'
import type { SubmitEvent } from 'react'
import { createFileRoute } from '@tanstack/react-router'
import Alert from 'react-bootstrap/Alert'
import Badge from 'react-bootstrap/Badge'
import Button from 'react-bootstrap/Button'
import Card from 'react-bootstrap/Card'
import Col from 'react-bootstrap/Col'
import Container from 'react-bootstrap/Container'
import Form from 'react-bootstrap/Form'
import Row from 'react-bootstrap/Row'
import Spinner from 'react-bootstrap/Spinner'
import { useAuth } from '#/hooks/useAuth'
import { getAllCaseFindings } from '#/lib/findings'
import {
  useActiveAttemptQuery,
  useCreateAttemptMutation,
  useGenerateRevisionMutation,
  useProcessVivaTurnMutation,
  useUserAttemptsQuery,
} from '#/hooks/useVivaQueries'

import caseData from '#/data/case-ea-viva-001.json'
import { useVivaVoice } from '#/hooks/useVivaVoice'
import { RevisionCard } from '#/components/RevisionCard'
import { FindingsBoard } from '#/components/FindingsBoard'
import { TurnIndicator } from '#/components/TurnIndicator'

const STORAGE_ATTEMPT_KEY = 'ea_viva_active_attempt_id'

export const Route = createFileRoute('/')({
  component: VivaHomePage,
})

function VivaHomePage() {
  const { user, signOutUser } = useAuth()
  const [sidebarOpen, setSidebarOpen] = useState(true)
  const [selectedAttemptId, setSelectedAttemptId] = useState<string | null>(
    null,
  )
  const [typedInput, setTypedInput] = useState('')
  const [pageError, setPageError] = useState<string | null>(null)

  // Prevents duplicate auto-creation across re-renders / Strict Mode
  const autoCreateInFlightRef = useRef(false)
  const autoCreatedForUidRef = useRef<string | null>(null)

  const uid = user?.uid ?? null
  const allFindings = getAllCaseFindings()

  const attemptsQuery = useUserAttemptsQuery(uid)
  const createAttemptMutation = useCreateAttemptMutation(uid)
  const processTurnMutation = useProcessVivaTurnMutation(uid)
  const generateRevisionMutation = useGenerateRevisionMutation(uid)

  const existingList = attemptsQuery.data ?? []
  const savedId =
    typeof window !== 'undefined'
      ? window.localStorage.getItem(STORAGE_ATTEMPT_KEY)
      : null

  const resolvedAttemptId =
    selectedAttemptId && existingList.some((a) => a.id === selectedAttemptId)
      ? selectedAttemptId
      : savedId && existingList.some((a) => a.id === savedId)
        ? savedId
        : (existingList[0]?.id ?? null)

  // One-shot initial attempt creation without useEffect
  if (
    uid &&
    !attemptsQuery.isLoading &&
    existingList.length === 0 &&
    !autoCreateInFlightRef.current &&
    !createAttemptMutation.isPending &&
    autoCreatedForUidRef.current !== uid
  ) {
    autoCreateInFlightRef.current = true
    autoCreatedForUidRef.current = uid

    createAttemptMutation
      .mutateAsync({
        caseId: caseData.case_id,
        title: caseData.title,
        openingPrompt: caseData.opening_prompt,
      })
      .then((created) => {
        setSelectedAttemptId(created.id)
        if (typeof window !== 'undefined') {
          window.localStorage.setItem(STORAGE_ATTEMPT_KEY, created.id)
        }
      })
      .catch((err) => {
        autoCreatedForUidRef.current = null
        setPageError(
          err instanceof Error
            ? err.message
            : 'Failed to create initial attempt.',
        )
      })
      .finally(() => {
        autoCreateInFlightRef.current = false
      })
  }

  const activeAttemptQuery = useActiveAttemptQuery(uid, resolvedAttemptId)
  const activeAttempt =
    activeAttemptQuery.data ??
    existingList.find((a) => a.id === resolvedAttemptId) ??
    null

  const handleNewAttempt = async () => {
    if (!uid || createAttemptMutation.isPending) return
    setPageError(null)
    const created = await createAttemptMutation.mutateAsync({
      caseId: caseData.case_id,
      title: caseData.title,
      openingPrompt: caseData.opening_prompt,
    })
    setSelectedAttemptId(created.id)
    if (typeof window !== 'undefined') {
      window.localStorage.setItem(STORAGE_ATTEMPT_KEY, created.id)
    }
  }

  const handleSelectAttempt = (attemptId: string) => {
    setPageError(null)
    setSelectedAttemptId(attemptId)
    if (typeof window !== 'undefined') {
      window.localStorage.setItem(STORAGE_ATTEMPT_KEY, attemptId)
    }
  }

  const handleSignOut = async () => {
    autoCreateInFlightRef.current = false
    autoCreatedForUidRef.current = null
    setSelectedAttemptId(null)
    await signOutUser()
  }

  const voice = useVivaVoice({
    onFinalTranscript: async (transcript) => {
      if (!activeAttempt) return
      setPageError(null)

      const { spokenResponse } = await processTurnMutation.mutateAsync({
        attempt: activeAttempt,
        transcript,
      })

      voice.speakText(spokenResponse)
    },
  })

  const handleTextSubmit = async (e: SubmitEvent) => {
    e.preventDefault()
    if (!typedInput.trim()) return
    const text = typedInput.trim()
    setTypedInput('')
    await voice.submitUtterance(text)
  }

  const handleGenerateRevision = async () => {
    if (!activeAttempt || generateRevisionMutation.isPending) return
    setPageError(null)

    try {
      await generateRevisionMutation.mutateAsync({
        attempt: activeAttempt,
      })
    } catch (err) {
      setPageError(
        err instanceof Error
          ? err.message
          : 'Failed to generate revision point.',
      )
    }
  }

  const isBusy = voice.phase === 'processing' || processTurnMutation.isPending

  const combinedError =
    pageError ??
    voice.voiceError ??
    (processTurnMutation.error instanceof Error
      ? processTurnMutation.error.message
      : null) ??
    (generateRevisionMutation.error instanceof Error
      ? generateRevisionMutation.error.message
      : null)

  return (
    <div className="min-vh-100 d-flex bg-light text-dark">
      {sidebarOpen && (
        <aside
          className="border-end bg-white d-flex flex-column justify-content-between shrink-0"
          style={{ width: '18rem' }}
        >
          <div className="p-3 d-flex flex-column gap-3 overflow-y-auto">
            <div className="d-flex align-items-center justify-content-between">
              <span className="text-uppercase fw-semibold text-secondary small">
                Saved Attempts
              </span>
              <Button
                type="button"
                variant="dark"
                size="sm"
                onClick={handleNewAttempt}
                disabled={createAttemptMutation.isPending}
              >
                + New Attempt
              </Button>
            </div>

            {attemptsQuery.isLoading ? (
              <div className="d-flex align-items-center gap-2 small text-secondary">
                <Spinner animation="border" size="sm" role="status" />
                <span>Loading attempts...</span>
              </div>
            ) : (
              <div className="d-flex flex-column gap-2">
                {existingList.map((att) => {
                  const isSelected = activeAttempt?.id === att.id
                  return (
                    <Button
                      key={att.id}
                      type="button"
                      variant={isSelected ? 'dark' : 'light'}
                      onClick={() => handleSelectAttempt(att.id)}
                      className={`w-100 text-start border px-3 py-2 ${
                        isSelected ? 'text-white' : 'text-dark'
                      }`}
                    >
                      <div className="small fw-semibold text-truncate">
                        {att.caseId}: {att.title}
                      </div>
                      <div
                        className={`mt-1 ${
                          isSelected
                            ? 'text-light opacity-75'
                            : 'text-secondary'
                        }`}
                        style={{ fontSize: '0.7rem' }}
                      >
                        {att.status === 'completed'
                          ? 'Completed'
                          : 'In Progress'}{' '}
                        · {att.messages.length} turns ·{' '}
                        {att.revealedFindingIds.length} findings
                      </div>
                    </Button>
                  )
                })}
              </div>
            )}
          </div>

          {user && (
            <div className="border-top p-3 d-flex flex-column gap-2">
              <div className="small text-secondary text-truncate">
                {user.email}
              </div>
              <Button
                size="sm"
                type="button"
                variant="outline-secondary"
                className="w-100"
                onClick={handleSignOut}
              >
                Sign Out
              </Button>
            </div>
          )}
        </aside>
      )}

      <div className="flex-1 d-flex flex-column min-w-0 w-100">
        <header className="border-bottom bg-white px-4 py-3 d-flex align-items-center justify-content-between gap-3">
          <div className="d-flex align-items-center gap-3 min-w-0">
            <Button
              type="button"
              variant="outline-secondary"
              size="sm"
              onClick={() => setSidebarOpen((prev) => !prev)}
            >
              {sidebarOpen ? 'Hide History' : 'History'}
            </Button>
            <div className="min-w-0">
              <div className="text-uppercase fw-semibold text-secondary small">
                Eye Academy · {caseData.case_id}
              </div>
              <h1 className="h6 mb-0 fw-semibold text-dark text-truncate">
                {caseData.title}
              </h1>
            </div>
          </div>

          <Badge
            bg="light"
            text="secondary"
            pill
            className="d-none d-sm-inline-block border px-3 py-2 fw-medium"
          >
            Practice Viva
          </Badge>
        </header>

        <Container as="main" className="py-4" style={{ maxWidth: '56rem' }}>
          <div className="d-flex flex-column gap-3">
            <TurnIndicator phase={voice.phase} lastTurnMs={voice.lastTurnMs} />

            {combinedError && (
              <Alert variant="danger" className="mb-0 py-2 px-3 small">
                {combinedError}
              </Alert>
            )}

            <Card className="border">
              <Card.Body className="p-4 d-flex flex-column gap-3">
                <div className="d-flex align-items-center justify-content-between gap-2">
                  <Card.Title
                    as="h2"
                    className="small mb-0 fw-semibold text-uppercase text-secondary"
                  >
                    Patient Case Report
                  </Card.Title>
                  <span className="small text-secondary">
                    {caseData.patient.age}-year-old {caseData.patient.sex}
                  </span>
                </div>

                <p className="mb-0 rounded-3 bg-light p-3 small fw-medium text-dark">
                  {caseData.opening_prompt}
                </p>

                <Row className="g-2 small text-body-secondary">
                  <Col xs={12} sm={6}>
                    <strong className="text-dark">Presenting complaint:</strong>{' '}
                    {caseData.patient.presenting_complaint}
                  </Col>
                  <Col xs={12} sm={6}>
                    <strong className="text-dark">Past ocular history:</strong>{' '}
                    {caseData.patient.past_ocular_history}
                  </Col>
                  <Col xs={12} sm={6}>
                    <strong className="text-dark">Medications:</strong>{' '}
                    {caseData.patient.medications.join('; ')}
                  </Col>
                  <Col xs={12} sm={6}>
                    <strong className="text-dark">
                      Allergies & family history:
                    </strong>{' '}
                    Allergy to {caseData.patient.allergies}.{' '}
                    {caseData.patient.family_history}
                  </Col>
                </Row>
              </Card.Body>
            </Card>

            <Card className="border">
              <Card.Body className="p-4 d-flex flex-column gap-3">
                <div className="d-flex flex-column align-items-center justify-content-center gap-2 text-center">
                  {voice.phase !== 'listening' ? (
                    <Button
                      type="button"
                      variant="dark"
                      className="px-4 py-2"
                      onClick={voice.startListening}
                      disabled={isBusy || !activeAttempt}
                    >
                      Speak to Examiner
                    </Button>
                  ) : (
                    <Button
                      type="button"
                      variant="danger"
                      className="px-4 py-2"
                      onClick={voice.stopListening}
                    >
                      Stop & Send Speech
                    </Button>
                  )}

                  <p className="mb-0 small text-secondary">
                    {voice.liveTranscript
                      ? `Heard: "${voice.liveTranscript}"`
                      : 'Ask for exam findings, state your diagnosis or management, or answer the follow-up.'}
                  </p>
                </div>

                <Form onSubmit={handleTextSubmit} className="d-flex gap-2">
                  <Form.Control
                    type="text"
                    value={typedInput}
                    onChange={(e) => setTypedInput(e.target.value)}
                    disabled={isBusy || !activeAttempt}
                    placeholder="Type or edit a finding request or response..."
                  />
                  <Button
                    type="submit"
                    variant="outline-dark"
                    disabled={isBusy || !typedInput.trim() || !activeAttempt}
                  >
                    Send
                  </Button>
                </Form>
              </Card.Body>
            </Card>

            <Card className="border">
              <Card.Body className="p-4">
                <Card.Title
                  as="h2"
                  className="small mb-3 fw-semibold text-uppercase text-secondary"
                >
                  Transcript
                </Card.Title>
                <div
                  className="d-flex flex-column gap-2 overflow-y-auto pe-1"
                  style={{ maxHeight: '20rem' }}
                >
                  {activeAttempt?.messages.map((msg) => (
                    <div
                      key={msg.id}
                      className={`rounded-3 p-3 small ${
                        msg.role === 'examiner'
                          ? 'bg-light text-dark'
                          : 'bg-dark text-white ms-4'
                      }`}
                    >
                      <div
                        className="fw-semibold text-uppercase opacity-75"
                        style={{ fontSize: '0.7rem', letterSpacing: '0.04em' }}
                      >
                        {msg.role === 'examiner' ? 'Examiner' : 'Trainee'}
                      </div>
                      <p
                        className="mt-1 mb-0"
                        style={{ whiteSpace: 'pre-line' }}
                      >
                        {msg.text}
                      </p>
                    </div>
                  ))}
                </div>
              </Card.Body>
            </Card>

            <FindingsBoard
              allFindings={allFindings}
              revealedIds={activeAttempt?.revealedFindingIds ?? []}
            />

            <RevisionCard
              revision={activeAttempt?.revisionPoint}
              onGenerate={handleGenerateRevision}
              loading={generateRevisionMutation.isPending}
            />
          </div>
        </Container>
      </div>
    </div>
  )
}
