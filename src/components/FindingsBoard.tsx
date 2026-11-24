import Badge from 'react-bootstrap/Badge'
import ListGroup from 'react-bootstrap/ListGroup'
import type { FindingItem } from '../types/viva'

export function FindingsBoard({
  allFindings,
  revealedIds,
}: {
  allFindings: FindingItem[]
  revealedIds: string[]
}) {
  const revealedSet = new Set(revealedIds)
  const revealedItems = allFindings.filter((f) => revealedSet.has(f.id))

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
            const eyeText =
              item.eye === 'right'
                ? 'Right eye'
                : item.eye === 'left'
                  ? 'Left eye'
                  : item.eye === 'both'
                    ? 'Both eyes'
                    : 'General'

            return (
              <ListGroup.Item
                key={item.id}
                className={`px-2 py-2 border-light ${
                  item.available ? 'bg-white' : 'bg-light'
                }`}
              >
                <div className="d-flex align-items-center justify-content-between gap-2">
                  <span className="small fw-medium text-dark">
                    {eyeText} · {item.label}
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

                {item.available ? (
                  <p className="mt-1 mb-0 small text-body">
                    <strong>{String(item.value)}</strong>
                    {item.unit && !String(item.value).includes(item.unit)
                      ? ` ${item.unit}`
                      : ''}
                    {item.method ? (
                      <span className="text-secondary"> ({item.method})</span>
                    ) : null}
                  </p>
                ) : (
                  <p className="mt-1 mb-0 small text-secondary">
                    Not available: {item.unavailable_reason ?? 'Not recorded.'}
                  </p>
                )}
              </ListGroup.Item>
            )
          })}
        </ListGroup>
      )}
    </section>
  )
}
