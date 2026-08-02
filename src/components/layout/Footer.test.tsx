import { render, screen } from '@testing-library/react'
import { describe, it, expect, afterEach } from 'vitest'
import { Footer } from './Footer'

describe('Footer legal links', () => {
  it('renders links to Terms, Privacy, Returns, and Shipping', () => {
    render(<Footer />)

    expect(screen.getByRole('contentinfo')).toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'Terms' })).toHaveAttribute('href', '/legal/terms')
    expect(screen.getByRole('link', { name: 'Privacy' })).toHaveAttribute('href', '/legal/privacy')
    expect(screen.getByRole('link', { name: 'Returns' })).toHaveAttribute('href', '/legal/returns')
    expect(screen.getByRole('link', { name: 'Shipping' })).toHaveAttribute('href', '/legal/shipping')
  })
})

describe('Footer Grievance Officer contact', () => {
  const ORIGINAL_ENV = { ...process.env }

  afterEach(() => {
    process.env = { ...ORIGINAL_ENV }
  })

  it('renders an accessible Grievance Officer heading', () => {
    render(<Footer />)
    expect(screen.getByRole('heading', { name: 'Grievance Officer' })).toBeInTheDocument()
  })

  it('renders the configured name, email, and phone from env vars', () => {
    process.env.GRIEVANCE_OFFICER_NAME = 'Asha Rao'
    process.env.GRIEVANCE_OFFICER_EMAIL = 'grievance@visionnova.com'
    process.env.GRIEVANCE_OFFICER_PHONE = '+91-80-1234-5678'

    render(<Footer />)

    expect(screen.getByText('Asha Rao')).toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'grievance@visionnova.com' })).toHaveAttribute(
      'href',
      'mailto:grievance@visionnova.com'
    )
    expect(screen.getByRole('link', { name: '+91-80-1234-5678' })).toHaveAttribute(
      'href',
      'tel:+91-80-1234-5678'
    )
  })

  it('renders a visible placeholder instead of blank content when env vars are missing', () => {
    delete process.env.GRIEVANCE_OFFICER_NAME
    delete process.env.GRIEVANCE_OFFICER_EMAIL
    delete process.env.GRIEVANCE_OFFICER_PHONE

    render(<Footer />)

    expect(screen.getByText(/grievance officer name not configured/i)).toBeInTheDocument()
  })
})

describe('Footer newsletter signup', () => {
  it('renders the newsletter signup form', () => {
    render(<Footer />)
    expect(screen.getByRole('form', { name: /newsletter signup/i })).toBeInTheDocument()
  })
})
