import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import { PrescriptionStatusEmail } from './PrescriptionStatusEmail'

const clinicalValues = {
  rightSphere: -2.5,
  rightCylinder: -0.75,
  rightAxis: 90,
  rightAdd: null,
  leftSphere: -2.25,
  leftCylinder: -0.5,
  leftAxis: 85,
  leftAdd: null,
  pupillaryDistance: 62,
}

// EP-010 BUG-004 / FTC Eyeglass Rule (16 CFR 456.2): the seller must give the
// patient a copy of their prescription automatically once it's complete —
// "you can now complete your order" was not that. These tests pin the two
// ways this email now actually hands over the prescription.
describe('PrescriptionStatusEmail — approved with an uploaded file', () => {
  it('directs the patient to their account rather than embedding an unauthenticated link', () => {
    render(<PrescriptionStatusEmail firstName="Alex" status="approved" hasFile />)

    expect(screen.getByText(/log in to your visionnova account/i)).toBeInTheDocument()
  })

  it('does not render clinical values when a file exists', () => {
    render(
      <PrescriptionStatusEmail
        firstName="Alex"
        status="approved"
        hasFile
        clinicalValues={clinicalValues}
      />
    )

    expect(screen.queryByText(/-2\.5/)).not.toBeInTheDocument()
  })
})

describe('PrescriptionStatusEmail — approved, digitally authored (no file)', () => {
  it('includes the actual clinical values — this is the only copy of the prescription that exists', () => {
    render(
      <PrescriptionStatusEmail firstName="Alex" status="approved" clinicalValues={clinicalValues} />
    )

    expect(screen.getByText(/-2\.5/)).toBeInTheDocument()
    expect(screen.getByText(/-0\.75/)).toBeInTheDocument()
    expect(screen.getByTestId('rx-email-pd')).toHaveTextContent('62')
  })

  it('labels right and left eye values distinctly', () => {
    render(
      <PrescriptionStatusEmail firstName="Alex" status="approved" clinicalValues={clinicalValues} />
    )

    expect(screen.getByText(/OD/i)).toBeInTheDocument()
    expect(screen.getByText(/OS/i)).toBeInTheDocument()
  })
})

describe('PrescriptionStatusEmail — rejected', () => {
  it('never renders clinical values on a rejection, even if passed', () => {
    render(
      <PrescriptionStatusEmail firstName="Alex" status="rejected" clinicalValues={clinicalValues} />
    )

    expect(screen.queryByText(/-2\.5/)).not.toBeInTheDocument()
    expect(screen.getByText(/rejected/i)).toBeInTheDocument()
  })
})
