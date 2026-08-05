import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, it, expect } from 'vitest'
import { AuthField } from './AuthField'

describe('AuthField — password visibility toggle', () => {
  it('offers a reveal control on password fields', () => {
    render(<AuthField id="password" name="password" type="password" label="Password" />)

    expect(screen.getByRole('button', { name: /show password/i })).toBeInTheDocument()
  })

  it('does not offer one on non-password fields', () => {
    render(<AuthField id="email" name="email" type="email" label="Email address" />)

    expect(screen.queryByRole('button', { name: /show password/i })).not.toBeInTheDocument()
  })

  it('reveals the value and offers to hide it again', async () => {
    render(<AuthField id="password" name="password" type="password" label="Password" />)

    const input = screen.getByLabelText('Password')
    expect(input).toHaveAttribute('type', 'password')

    await userEvent.click(screen.getByRole('button', { name: /show password/i }))
    expect(input).toHaveAttribute('type', 'text')

    await userEvent.click(screen.getByRole('button', { name: /hide password/i }))
    expect(input).toHaveAttribute('type', 'password')
  })

  it('announces reveal state to assistive tech', async () => {
    render(<AuthField id="password" name="password" type="password" label="Password" />)

    const toggle = screen.getByRole('button', { name: /show password/i })
    expect(toggle).toHaveAttribute('aria-pressed', 'false')

    await userEvent.click(toggle)
    expect(screen.getByRole('button', { name: /hide password/i })).toHaveAttribute(
      'aria-pressed',
      'true',
    )
  })

  // Inside a <form>, a button with no explicit type submits it — revealing the
  // password would otherwise fire a half-filled registration.
  it('does not submit the surrounding form', () => {
    render(<AuthField id="password" name="password" type="password" label="Password" />)

    expect(screen.getByRole('button', { name: /show password/i })).toHaveAttribute(
      'type',
      'button',
    )
  })

  // The reveal control must not cost the field its error/hint wiring.
  it('keeps error wiring intact while revealed', async () => {
    render(
      <AuthField
        id="password"
        name="password"
        type="password"
        label="Password"
        errors={['This password has appeared in a data breach — please choose another']}
      />,
    )

    await userEvent.click(screen.getByRole('button', { name: /show password/i }))

    const input = screen.getByLabelText('Password')
    expect(input).toHaveAttribute('type', 'text')
    expect(input).toHaveAttribute('aria-invalid', 'true')
    expect(input).toHaveAttribute('aria-describedby', 'password-error')
  })
})
