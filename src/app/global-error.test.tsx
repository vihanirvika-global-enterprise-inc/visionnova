import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen } from '@testing-library/react'

vi.mock('@sentry/nextjs', () => ({ captureException: vi.fn() }))

import * as Sentry from '@sentry/nextjs'
import GlobalError from './global-error'

const error = Object.assign(new Error('render blew up'), { digest: 'abc123' })

beforeEach(() => {
  vi.clearAllMocks()
})

describe('GlobalError', () => {
  // Without this boundary, React rendering errors in the App Router never reach
  // Sentry at all.
  it('reports the error to Sentry', () => {
    render(<GlobalError error={error} reset={vi.fn()} />)

    expect(Sentry.captureException).toHaveBeenCalledWith(error)
  })

  it('shows a recovery affordance rather than a blank screen', () => {
    render(<GlobalError error={error} reset={vi.fn()} />)

    expect(screen.getByRole('heading', { level: 1 })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /try again/i })).toBeInTheDocument()
  })

  it('calls reset when the user retries', async () => {
    const reset = vi.fn()
    const { default: userEvent } = await import('@testing-library/user-event')
    render(<GlobalError error={error} reset={reset} />)

    await userEvent.setup().click(screen.getByRole('button', { name: /try again/i }))

    expect(reset).toHaveBeenCalled()
  })
})
