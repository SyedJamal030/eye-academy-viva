import Badge from 'react-bootstrap/Badge'
import type { TurnPhase } from '#/types/viva'

const PHASE_CONFIG: Record<
  TurnPhase,
  {
    label: string
    detail: string
    badgeVariant: string
    badgeClassName?: string
  }
> = {
  idle: {
    label: 'Ready for your turn',
    detail:
      'Hold Spacebar or Press Speak or type your question or management reasoning.',
    badgeVariant: 'success',
    badgeClassName:
      'bg-success-subtle text-success-emphasis border border-success-subtle',
  },
  listening: {
    label: 'Listening to you',
    detail: 'Speak clearly now. Stop talking or click Stop to submit.',
    badgeVariant: 'primary',
    badgeClassName:
      'bg-primary-subtle text-primary-emphasis border border-primary-subtle',
  },
  processing: {
    label: 'Examiner thinking',
    detail: 'Checking case findings and preparing one follow-up.',
    badgeVariant: 'warning',
    badgeClassName:
      'bg-warning-subtle text-warning-emphasis border border-warning-subtle',
  },
  speaking: {
    label: 'Examiner responding aloud',
    detail: 'Microphone paused while the examiner speaks.',
    badgeVariant: 'info',
    badgeClassName:
      'bg-info-subtle text-info-emphasis border border-info-subtle',
  },
}

export function TurnIndicator({
  phase,
  lastTurnMs,
}: {
  phase: TurnPhase
  lastTurnMs: number | null
}) {
  const cfg = PHASE_CONFIG[phase]

  return (
    <div
      className="d-flex flex-wrap align-items-center justify-content-between gap-2 rounded-3 border bg-white p-3"
      role="status"
      aria-live="polite"
    >
      <div className="d-flex flex-wrap align-items-center gap-3">
        <Badge
          pill
          bg={cfg.badgeVariant}
          className={`px-3 py-2 fw-semibold ${cfg.badgeClassName ?? ''}`}
        >
          {cfg.label}
        </Badge>
        <span className="small text-body-secondary">{cfg.detail}</span>
      </div>

      {lastTurnMs !== null && (
        <span className="small font-monospace text-secondary">
          Last turn: {lastTurnMs} ms
        </span>
      )}
    </div>
  )
}
