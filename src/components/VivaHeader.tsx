import Badge from 'react-bootstrap/Badge'
import Button from 'react-bootstrap/Button'

interface VivaHeaderProps {
  sidebarOpen: boolean
  caseId: string
  title: string
  onToggleSidebar: () => void
}

export function VivaHeader({
  sidebarOpen,
  caseId,
  title,
  onToggleSidebar,
}: VivaHeaderProps) {
  return (
    <header className="border-bottom bg-white px-4 py-3 d-flex align-items-center justify-content-between gap-3">
      <div className="d-flex align-items-center gap-3 min-w-0">
        <Button
          type="button"
          variant="outline-secondary"
          size="sm"
          onClick={onToggleSidebar}
        >
          {sidebarOpen ? 'Hide History' : 'History'}
        </Button>
        <div className="min-w-0">
          <div className="text-uppercase fw-semibold text-secondary small">
            Eye Academy · {caseId}
          </div>
          <h1 className="h6 mb-0 fw-semibold text-dark text-truncate">
            {title}
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
  )
}
