import Card from 'react-bootstrap/Card'
import Col from 'react-bootstrap/Col'
import Row from 'react-bootstrap/Row'
import type { VivaCaseData } from '#/types/viva'

interface PatientCaseCardProps {
  caseData: VivaCaseData
}

export function PatientCaseCard({ caseData }: PatientCaseCardProps) {
  const { patient } = caseData

  return (
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
            {patient.age}-year-old {patient.sex}
          </span>
        </div>

        <p className="mb-0 rounded-3 bg-light p-3 small fw-medium text-dark">
          {caseData.opening_prompt}
        </p>

        <Row className="g-2 small text-body-secondary">
          <Col xs={12} sm={6}>
            <strong className="text-dark">Presenting complaint:</strong>{' '}
            {patient.presenting_complaint}
          </Col>
          <Col xs={12} sm={6}>
            <strong className="text-dark">Past ocular history:</strong>{' '}
            {patient.past_ocular_history}
          </Col>
          <Col xs={12} sm={6}>
            <strong className="text-dark">Medications:</strong>{' '}
            {patient.medications.join('; ')}
          </Col>
          <Col xs={12} sm={6}>
            <strong className="text-dark">Allergies & family history:</strong>{' '}
            Allergy to {patient.allergies}. {patient.family_history}
          </Col>
        </Row>
      </Card.Body>
    </Card>
  )
}
