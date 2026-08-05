import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'

vi.mock('./actions', () => ({ bulkUpdateOrders: vi.fn() }))

import { bulkUpdateOrders } from './actions'
import BulkOrderActions from './BulkOrderActions'

beforeEach(() => {
  vi.clearAllMocks()
  vi.mocked(bulkUpdateOrders).mockResolvedValue(undefined as never)
})

describe('BulkOrderActions', () => {
  it('renders nothing when there are no orders to act on', () => {
    const { container } = render(<BulkOrderActions orderIds={[]} />)

    expect(container).toBeEmptyDOMElement()
  })

  it('disables Apply until at least one order is selected', () => {
    render(<BulkOrderActions orderIds={['order-1', 'order-2']} />)

    expect(screen.getByRole('button', { name: /apply/i })).toBeDisabled()
  })

  it('enables Apply once an order is checked, and shows the selected count', async () => {
    const user = userEvent.setup()
    render(<BulkOrderActions orderIds={['order-1', 'order-2']} />)

    await user.click(screen.getByLabelText('Select order order-1'))

    expect(screen.getByRole('button', { name: /apply to 1 selected/i })).toBeEnabled()
  })

  it('select all checks every order and Select all label reflects it', async () => {
    const user = userEvent.setup()
    render(<BulkOrderActions orderIds={['order-1', 'order-2']} />)

    await user.click(screen.getByLabelText('Select all orders'))

    expect(screen.getByLabelText('Select order order-1')).toBeChecked()
    expect(screen.getByLabelText('Select order order-2')).toBeChecked()
    expect(screen.getByRole('button', { name: /apply to 2 selected/i })).toBeInTheDocument()
  })

  it('submits the selected order ids and chosen status', async () => {
    const user = userEvent.setup()
    render(<BulkOrderActions orderIds={['order-1', 'order-2']} />)

    await user.click(screen.getByLabelText('Select order order-1'))
    await user.selectOptions(screen.getByLabelText(/set status/i), 'cancelled')
    await user.click(screen.getByRole('button', { name: /apply to 1 selected/i }))

    expect(bulkUpdateOrders).toHaveBeenCalledTimes(1)
    const submitted = vi.mocked(bulkUpdateOrders).mock.calls[0][0] as FormData
    expect(submitted.get('orderIds')).toBe('order-1')
    expect(submitted.get('status')).toBe('cancelled')
  })

  it('shows the error returned by the action instead of silently failing', async () => {
    vi.mocked(bulkUpdateOrders).mockResolvedValue({ error: 'Select at least one order' })
    const user = userEvent.setup()
    render(<BulkOrderActions orderIds={['order-1']} />)

    await user.click(screen.getByLabelText('Select order order-1'))
    await user.click(screen.getByRole('button', { name: /apply to 1 selected/i }))

    expect(await screen.findByRole('alert')).toHaveTextContent('Select at least one order')
  })
})
