import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, it, expect } from 'vitest'
import { NewsletterSignupForm } from './NewsletterSignupForm'

describe('NewsletterSignupForm', () => {
  it('renders an email input and a Subscribe button', () => {
    render(<NewsletterSignupForm />)

    expect(screen.getByRole('form', { name: /newsletter signup/i })).toBeInTheDocument()
    expect(screen.getByLabelText(/email address/i)).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /subscribe/i })).toBeInTheDocument()
  })

  it('shows no validation error before the form is submitted', () => {
    render(<NewsletterSignupForm />)
    expect(screen.queryByRole('alert')).not.toBeInTheDocument()
  })

  it('shows an inline validation error when submitting an empty email', async () => {
    render(<NewsletterSignupForm />)

    await userEvent.click(screen.getByRole('button', { name: /subscribe/i }))

    expect(screen.getByRole('alert')).toHaveTextContent(/enter a valid email address/i)
  })

  it('shows an inline validation error when submitting a malformed email', async () => {
    render(<NewsletterSignupForm />)

    await userEvent.type(screen.getByLabelText(/email address/i), 'not-an-email')
    await userEvent.click(screen.getByRole('button', { name: /subscribe/i }))

    expect(screen.getByRole('alert')).toHaveTextContent(/enter a valid email address/i)
  })

  it('clears the validation error once a well-formed email is entered', async () => {
    render(<NewsletterSignupForm />)

    await userEvent.click(screen.getByRole('button', { name: /subscribe/i }))
    expect(screen.getByRole('alert')).toBeInTheDocument()

    await userEvent.type(screen.getByLabelText(/email address/i), 'reader@example.com')
    await userEvent.click(screen.getByRole('button', { name: /subscribe/i }))

    expect(screen.queryByRole('alert')).not.toBeInTheDocument()
  })
})
