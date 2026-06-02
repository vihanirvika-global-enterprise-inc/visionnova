import { render, screen } from '@testing-library/react'
import { vi, describe, it, expect, beforeEach } from 'vitest'

vi.mock('@/lib/orders', () => ({ getOrdersByCustomer: vi.fn() }))

describe('AccountPage', () => {
  beforeEach(() => { vi.resetModules(); vi.clearAllMocks() })

  it('shows an empty state when there are no orders', async () => {
    const { getOrdersByCustomer } = await import('@/lib/orders')
    vi.mocked(getOrdersByCustomer).mockResolvedValueOnce([])

    const AccountPage = (await import('./page')).default
    render(await AccountPage())

    expect(screen.getByText('No orders yet')).toBeInTheDocument()
  })
})
