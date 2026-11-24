import Card from 'react-bootstrap/Card'
import type { VivaMessage } from '#/types/viva'

interface TranscriptPanelProps {
  messages: VivaMessage[] | undefined
}

export function TranscriptPanel({ messages }: TranscriptPanelProps) {
  return (
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
          {messages?.map((msg) => {
            const isExaminer = msg.role === 'examiner'
            return (
              <div
                key={msg.id}
                className={`rounded-3 p-3 small ${
                  isExaminer ? 'bg-light text-dark' : 'bg-dark text-white ms-4'
                }`}
              >
                <div
                  className="fw-semibold text-uppercase opacity-75"
                  style={{ fontSize: '0.7rem', letterSpacing: '0.04em' }}
                >
                  {isExaminer ? 'Examiner' : 'Trainee'}
                </div>
                <p className="mt-1 mb-0" style={{ whiteSpace: 'pre-line' }}>
                  {msg.text}
                </p>
              </div>
            )
          })}
        </div>
      </Card.Body>
    </Card>
  )
}
