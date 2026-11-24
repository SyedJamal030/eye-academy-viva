import Button from 'react-bootstrap/Button'
import Card from 'react-bootstrap/Card'
import Form from 'react-bootstrap/Form'
import type { TurnPhase } from '#/types/viva'

interface ExaminerTurnControlsProps {
  phase: TurnPhase
  liveTranscript: string
  typedInput: string
  isBusy: boolean
  hasActiveAttempt: boolean
  onStartListening: () => void
  onStopListening: () => void
  onTypedInputChange: (value: string) => void
  onSubmit: (e: React.FormEvent<HTMLFormElement>) => void
}

export function ExaminerTurnControls({
  phase,
  liveTranscript,
  typedInput,
  isBusy,
  hasActiveAttempt,
  onStartListening,
  onStopListening,
  onTypedInputChange,
  onSubmit,
}: ExaminerTurnControlsProps) {
  return (
    <Card className="border">
      <Card.Body className="p-4 d-flex flex-column gap-3">
        <div className="d-flex flex-column align-items-center justify-content-center gap-2 text-center">
          {phase !== 'listening' ? (
            <Button
              type="button"
              variant="dark"
              className="px-4 py-2"
              onClick={onStartListening}
              disabled={isBusy || !hasActiveAttempt}
            >
              Speak to Examiner
            </Button>
          ) : (
            <Button
              type="button"
              variant="danger"
              className="px-4 py-2"
              onClick={onStopListening}
            >
              Stop & Send Speech
            </Button>
          )}

          <p
            className="mb-0 small text-secondary"
            role="status"
            aria-live="polite"
          >
            {liveTranscript
              ? `Heard: "${liveTranscript}"`
              : 'Ask for exam findings, state your diagnosis or management, or answer the follow-up.'}
          </p>
        </div>

        <Form onSubmit={onSubmit} className="d-flex gap-2">
          <Form.Control
            type="text"
            value={typedInput}
            onChange={(e) => onTypedInputChange(e.target.value)}
            disabled={isBusy || !hasActiveAttempt}
            placeholder="Type or edit a finding request or response..."
            aria-label="Type a finding request or response"
          />
          <Button
            type="submit"
            variant="outline-dark"
            disabled={isBusy || !typedInput.trim() || !hasActiveAttempt}
          >
            Send
          </Button>
        </Form>
      </Card.Body>
    </Card>
  )
}
