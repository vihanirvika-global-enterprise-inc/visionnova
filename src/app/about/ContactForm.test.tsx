import { render, screen } from '@testing-library/react'
import { describe, it, expect, vi } from 'vitest'
import ContactForm from './ContactForm'

vi.mock('./actions', () => ({ sendContactEmail: vi.fn() }))

describe('ContactForm honeypot field', () => {
  it('renders a honeypot input hidden from sighted and assistive-tech users', () => {
    const { container } = render(<ContactForm />)

    const honeypot = container.querySelector('input[name="company"]')
    expect(honeypot).not.toBeNull()
    expect(honeypot).toHaveAttribute('aria-hidden', 'true')
    expect(honeypot).toHaveAttribute('tabindex', '-1')
    expect(honeypot).toHaveAttribute('autocomplete', 'off')
  })

  // A real user must never be able to tab into it or be told to fill it in.
  it('does not render a visible label for the honeypot field', () => {
    render(<ContactForm />)
    expect(screen.queryByText(/company/i)).not.toBeInTheDocument()
  })

  it('does not affect the visible, real fields', () => {
    render(<ContactForm />)

    expect(screen.getByLabelText(/^name$/i)).toBeInTheDocument()
    expect(screen.getByLabelText(/^email$/i)).toBeInTheDocument()
    expect(screen.getByLabelText(/^message$/i)).toBeInTheDocument()
  })
})
