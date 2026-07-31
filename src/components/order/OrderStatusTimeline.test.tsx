import { describe, it, expect } from 'vitest'
import { render, screen, within } from '@testing-library/react'
import OrderStatusTimeline, { ORDER_TIMELINE } from './OrderStatusTimeline'

describe('ORDER_TIMELINE', () => {
  it('is the five states an order moves through in order', () => {
    expect(ORDER_TIMELINE).toEqual(['pending', 'paid', 'processing', 'shipped', 'delivered'])
  })
})

describe('OrderStatusTimeline', () => {
  it('renders every step', () => {
    render(<OrderStatusTimeline status="pending" />)

    expect(screen.getAllByRole('listitem')).toHaveLength(5)
    for (const label of ['Placed', 'Paid', 'Processing', 'Shipped', 'Delivered']) {
      expect(screen.getByText(label)).toBeInTheDocument()
    }
  })

  it('marks reached steps complete and later steps upcoming', () => {
    render(<OrderStatusTimeline status="processing" />)

    const steps = screen.getAllByRole('listitem')
    expect(steps[0]).toHaveAttribute('data-state', 'complete') // pending
    expect(steps[1]).toHaveAttribute('data-state', 'complete') // paid
    expect(steps[2]).toHaveAttribute('data-state', 'current') // processing
    expect(steps[3]).toHaveAttribute('data-state', 'upcoming') // shipped
    expect(steps[4]).toHaveAttribute('data-state', 'upcoming') // delivered
  })

  it('marks the current step for assistive tech', () => {
    render(<OrderStatusTimeline status="shipped" />)

    const current = screen.getByRole('listitem', { current: 'step' })
    expect(within(current).getByText('Shipped')).toBeInTheDocument()
  })

  it('treats a delivered order as fully complete', () => {
    render(<OrderStatusTimeline status="delivered" />)

    const steps = screen.getAllByRole('listitem')
    expect(steps.slice(0, 4).every((s) => s.getAttribute('data-state') === 'complete')).toBe(true)
    expect(steps[4]).toHaveAttribute('data-state', 'current')
  })
})

// cancelled and payment_failed are not points on the happy path. Rendering them
// as timeline progress would imply the order is still moving toward delivery.
describe('OrderStatusTimeline — exception states', () => {
  it.each([
    ['cancelled', /cancelled/i],
    ['payment_failed', /payment failed/i],
  ])('shows %s as an alert instead of progress', (status, pattern) => {
    render(<OrderStatusTimeline status={status as never} />)

    expect(screen.getByRole('alert')).toHaveTextContent(pattern)
    expect(screen.queryAllByRole('listitem')).toHaveLength(0)
  })
})
