import { render, screen, within } from '@testing-library/react'
import { describe, it, expect } from 'vitest'
import { ComplianceBar } from './ComplianceBar'

// Moved out of src/app/page.tsx and into the root layout: the claims apply to
// the business, not to one screen, and the mockup repeated them in the header
// on every page. Owning them in one place is what stops the four claims
// drifting apart across screens.
describe('ComplianceBar', () => {
  it('states the four compliance claims', () => {
    render(<ComplianceBar />)

    const bar = screen.getByRole('note', { name: /compliance/i })
    for (const claim of [/made in india/i, /cdsco licensed/i, /bis[- ]certified/i, /dpdp compliant/i]) {
      expect(within(bar).getByText(claim)).toBeInTheDocument()
    }
  })

  // The numbers behind these claims do not exist yet. Stating "CDSCO
  // licensed" is approved copy; printing an invented licence number is a
  // claim we cannot substantiate. See the TODO in Footer.tsx.
  it('prints no statutory identifier numbers', () => {
    const { container } = render(<ComplianceBar />)

    expect(container.textContent).not.toMatch(/GSTIN|\bCIN\b|MFG\/\d/i)
  })

  it('marks its icons decorative so the claims read once', () => {
    const { container } = render(<ComplianceBar />)

    for (const svg of Array.from(container.querySelectorAll('svg'))) {
      expect(svg).toHaveAttribute('aria-hidden', 'true')
    }
  })
})
