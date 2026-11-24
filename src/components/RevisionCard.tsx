import Alert from 'react-bootstrap/Alert'
import Button from 'react-bootstrap/Button'
import type { CitedRevisionPoint } from '../types/viva'

export function RevisionCard({
  revision,
  onGenerate,
  loading,
}: {
  revision: CitedRevisionPoint | null | undefined
  onGenerate: () => void
  loading: boolean
}) {
  return (
    <section className="rounded-3 border bg-white p-4">
      <div className="d-flex flex-wrap align-items-center justify-content-between gap-2">
        <div>
          <h2 className="h6 mb-1 fw-semibold text-dark">
            Reference Note Revision Point
          </h2>
          <p className="mb-0 small text-secondary">
            One takeaway based on your answer with page citation from the
            glaucoma note.
          </p>
        </div>

        <Button
          type="button"
          variant="dark"
          size="sm"
          onClick={onGenerate}
          disabled={loading}
        >
          {loading
            ? 'Generating...'
            : revision
              ? 'Regenerate Revision'
              : 'Generate Revision Point'}
        </Button>
      </div>

      {!revision ? (
        <p className="mt-3 mb-0 small text-secondary">
          Share your diagnosis or management thoughts during the viva, then
          generate your revision point.
        </p>
      ) : !revision.supported ? (
        <Alert variant="warning" className="mt-3 mb-0 small">
          {revision.revisionPoint}
        </Alert>
      ) : (
        <div className="mt-3 d-flex flex-column gap-2 rounded-3 border bg-light p-3">
          <p className="mb-0 small fw-medium text-dark">
            {revision.revisionPoint}
          </p>
          <p className="mb-0 small fw-semibold text-body-secondary">
            Source: Eye Academy Glaucoma Reference Note — Page{' '}
            {revision.pageNumber}
          </p>
          {revision.excerpt && (
            <blockquote className="mb-0 border-start border-2 border-secondary ps-3 small fst-italic text-body-secondary">
              "{revision.excerpt}"
            </blockquote>
          )}
        </div>
      )}
    </section>
  )
}
