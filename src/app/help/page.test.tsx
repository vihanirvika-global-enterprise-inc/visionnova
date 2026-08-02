import { render, screen } from '@testing-library/react'
import { describe, it, expect } from 'vitest'
import HelpPage from './page'

describe('HelpPage prescription security copy', () => {
  it('does not claim encryption that has no backing implementation', () => {
    render(<HelpPage />)
    const answer = screen.getByText(/is my prescription data secure/i)
      .closest('details')
      ?.querySelector('p')

    expect(answer?.textContent).not.toMatch(/encrypt/i)
  })

  it('describes the security properties that are actually real: access control and logging', () => {
    render(<HelpPage />)
    const answer = screen.getByText(/is my prescription data secure/i)
      .closest('details')
      ?.querySelector('p')

    expect(answer?.textContent).toMatch(/access/i)
  })
})
