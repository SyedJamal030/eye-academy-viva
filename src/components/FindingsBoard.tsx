import { useMemo } from 'react'
import Badge from 'react-bootstrap/Badge'
import ListGroup from 'react-bootstrap/ListGroup'
import { formatFindingForDisplayAndSpeech } from '#/lib/findings'
import type { EyeSide, FindingItem } from '#/types/viva'

function formatEyeLabel(eye: EyeSide): string {
  if (eye === 'right') return 'Right eye'
  if (eye === 'left') return 'Left eye'
  if (eye === 'both') return 'Both eyes'
  return 'General'
}

export function FindingsBoard({
  allFindings,
  revealedIds,
}: {
  allFindings: FindingItem[]
  revealedIds: string[]
}) {
  const revealedItems = useMemo(() => {
    const revealedSet = new Set(revealedIds)
    return allFindings.filter((f) => revealedSet.has(f.id))
  }, [allFindings, revealedIds])

  return (
    <section className="rounded-3 border bg-white p-4">
      <div className="d-flex align-items-center justify-content-between">
        <h2 className="h6 mb-0 fw-semibold text-dark">
          Revealed Examination Findings
        </h2>
        <span className="small text-secondary">
          {revealedItems.length} of {allFindings.length} asked
        </span>
      </div>

      {revealedItems.length === 0 ? (
        <p className="mt-3 mb-0 small text-secondary">
          No findings revealed yet in this attempt. Ask for a finding such as
          right eye IOP, pupils, or gonioscopy.
        </p>
      ) : (
        <ListGroup variant="flush" className="mt-3">
          {revealedItems.map((item) => {
            const { displaySummary } = formatFindingForDisplayAndSpeech(item)

            return (
              <ListGroup.Item
                key={item.id}
                className={`px-2 py-2 border-light ${
                  item.available ? 'bg-white' : 'bg-light'
                }`}
              >
                <div className="d-flex align-items-center justify-content-between gap-2">
                  <span className="small fw-medium text-dark">
                    {formatEyeLabel(item.eye)} · {item.label}
                  </span>
                  <Badge
                    bg={item.available ? 'success' : 'secondary'}
                    className={
                      item.available
                        ? 'bg-success-subtle text-success-emphasis fw-medium'
                        : 'bg-secondary-subtle text-secondary-emphasis fw-medium'
                    }
                  >
                    {item.available ? 'Available' : 'Unavailable'}
                  </Badge>
                </div>

                <p
                  className={`mt-1 mb-0 small ${
                    item.available ? 'text-body fw-medium' : 'text-secondary'
                  }`}
                >
                  {displaySummary}
                </p>
              </ListGroup.Item>
            )
          })}
        </ListGroup>
      )}
    </section>
  )
}
