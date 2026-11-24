import Button from 'react-bootstrap/Button'
import Spinner from 'react-bootstrap/Spinner'
import { useAuth } from '#/hooks/useAuth'
import type { VivaAttempt } from '#/types/viva'

interface VivaSidebarProps {
  isOpen: boolean
  isLoadingAttempts: boolean
  isCreatingAttempt: boolean
  attempts: VivaAttempt[]
  activeAttemptId: string | null
  onNewAttempt: () => void
  onSelectAttempt: (attemptId: string) => void
}

export function VivaSidebar({
  isOpen,
  isLoadingAttempts,
  isCreatingAttempt,
  attempts,
  activeAttemptId,
  onNewAttempt,
  onSelectAttempt,
}: VivaSidebarProps) {
  const { user, signOutUser } = useAuth()

  if (!isOpen) return null

  return (
    <aside
      className="border-end bg-white d-flex flex-column justify-content-between shrink-0"
      style={{ width: '18rem' }}
      aria-label="Saved viva attempts"
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
            onClick={onNewAttempt}
            disabled={isCreatingAttempt}
          >
            + New Attempt
          </Button>
        </div>

        {isLoadingAttempts ? (
          <div className="d-flex align-items-center gap-2 small text-secondary">
            <Spinner animation="border" size="sm" role="status" />
            <span>Loading attempts...</span>
          </div>
        ) : (
          <div className="d-flex flex-column gap-2">
            {attempts.map((att) => {
              const isSelected = activeAttemptId === att.id
              return (
                <Button
                  key={att.id}
                  type="button"
                  variant={isSelected ? 'dark' : 'light'}
                  onClick={() => onSelectAttempt(att.id)}
                  className={`w-100 text-start border px-3 py-2 ${
                    isSelected ? 'text-white' : 'text-dark'
                  }`}
                >
                  <div className="small fw-semibold text-truncate">
                    {att.caseId}: {att.title}
                  </div>
                  <div
                    className={`mt-1 ${
                      isSelected ? 'text-light opacity-75' : 'text-secondary'
                    }`}
                    style={{ fontSize: '0.7rem' }}
                  >
                    {att.status === 'completed' ? 'Completed' : 'In Progress'} ·{' '}
                    {att.messages.length} turns ·{' '}
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
          <div className="small text-secondary text-truncate">{user.email}</div>
          <Button
            size="sm"
            type="button"
            variant="outline-secondary"
            className="w-100"
            onClick={() => void signOutUser()}
          >
            Sign Out
          </Button>
        </div>
      )}
    </aside>
  )
}
