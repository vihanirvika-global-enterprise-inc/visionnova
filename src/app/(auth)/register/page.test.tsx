import { render, screen } from '@testing-library/react'
import { describe, it, expect } from 'vitest'
import RegisterPage from './page'

describe('RegisterPage', () => {
  it('renders email and password input fields', () => {
    render(<RegisterPage />)
    expect(screen.getByLabelText(/email/i)).toBeInTheDocument()
    expect(screen.getByLabelText(/password/i)).toBeInTheDocument()
  })

  it('renders first name and last name input fields', () => {
    render(<RegisterPage />)
    expect(screen.getByLabelText(/first name/i)).toBeInTheDocument()
    expect(screen.getByLabelText(/last name/i)).toBeInTheDocument()
  })

  it('renders a create account submit button', () => {
    render(<RegisterPage />)
    expect(screen.getByRole('button', { name: /create account/i })).toBeInTheDocument()
  })

  it('renders a link to the login page', () => {
    render(<RegisterPage />)
    expect(screen.getByRole('link', { name: /login/i })).toBeInTheDocument()
  })
})
