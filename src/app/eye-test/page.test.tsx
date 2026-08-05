import { render, screen } from '@testing-library/react'
import { describe, it, expect, vi, beforeEach } from 'vitest'

vi.mock('@/lib/session', () => ({ getSession: vi.fn() }))
vi.mock('@/lib/eyeTestAppointments', () => ({
  getOptometrists: vi.fn(),
  getBookedSlotTimes: vi.fn(),
  generateAvailableSlots: vi.fn(),
}))
vi.mock('next/navigation', () => ({
  redirect: vi.fn(() => { throw new Error('NEXT_REDIRECT') }),
}))

function makeOptometrist(overrides: Record<string, unknown> = {}) {
  return {
    id: 'opt-1', email: 'opt@visionnova.com', passwordHash: 'x',
    firstName: 'Ada', lastName: 'Lovelace', phone: null, role: 'optometrist' as const,
    createdAt: new Date(), updatedAt: new Date(),
    ...overrides,
  }
}

async function renderEyeTestPage(searchParams: Record<string, string> = {}) {
  const EyeTestPage = (await import('./page')).default
  render(await EyeTestPage({ searchParams }))
}

describe('EyeTestPage', () => {
  beforeEach(async () => {
    vi.resetModules()
    vi.clearAllMocks()
    const { getSession } = await import('@/lib/session')
    vi.mocked(getSession).mockReturnValue({ customerId: 'cust-1', role: 'customer' })
  })

  it('redirects to /login when there is no session', async () => {
    const { getSession } = await import('@/lib/session')
    const { redirect } = await import('next/navigation')
    vi.mocked(getSession).mockReturnValue(null)

    await expect(renderEyeTestPage()).rejects.toThrow('NEXT_REDIRECT')
    expect(redirect).toHaveBeenCalledWith('/login')
  })

  it('lists optometrists when none is selected yet', async () => {
    const { getOptometrists } = await import('@/lib/eyeTestAppointments')
    vi.mocked(getOptometrists).mockResolvedValueOnce([makeOptometrist()])

    await renderEyeTestPage()

    expect(screen.getByText('Dr. Ada Lovelace')).toBeInTheDocument()
    expect(screen.getByRole('link', { name: /select/i })).toHaveAttribute(
      'href', '/eye-test?optometrist=opt-1'
    )
  })

  it('shows an empty state when there are no optometrists at all', async () => {
    const { getOptometrists } = await import('@/lib/eyeTestAppointments')
    vi.mocked(getOptometrists).mockResolvedValueOnce([])

    await renderEyeTestPage()

    expect(screen.getByText(/no optometrists are available/i)).toBeInTheDocument()
  })

  it('shows available slots for the selected optometrist', async () => {
    const { getOptometrists, getBookedSlotTimes, generateAvailableSlots } =
      await import('@/lib/eyeTestAppointments')
    vi.mocked(getOptometrists).mockResolvedValueOnce([makeOptometrist()])
    vi.mocked(getBookedSlotTimes).mockResolvedValueOnce([])
    const slot = new Date('2026-03-02T10:00:00.000Z')
    vi.mocked(generateAvailableSlots).mockReturnValueOnce([slot])

    await renderEyeTestPage({ optometrist: 'opt-1' })

    expect(getBookedSlotTimes).toHaveBeenCalledWith('opt-1', expect.any(Date), expect.any(Date))
    const slotButton = screen.getByRole('button')
    expect(slotButton.closest('form')).toHaveFormValues({
      optometristId: 'opt-1',
      scheduledAt: slot.toISOString(),
    })
  })

  it('shows an empty state when the selected optometrist has no available slots', async () => {
    const { getOptometrists, getBookedSlotTimes, generateAvailableSlots } =
      await import('@/lib/eyeTestAppointments')
    vi.mocked(getOptometrists).mockResolvedValueOnce([makeOptometrist()])
    vi.mocked(getBookedSlotTimes).mockResolvedValueOnce([])
    vi.mocked(generateAvailableSlots).mockReturnValueOnce([])

    await renderEyeTestPage({ optometrist: 'opt-1' })

    expect(screen.getByText(/no available slots/i)).toBeInTheDocument()
  })

  it('shows the error passed back from a failed booking attempt', async () => {
    const { getOptometrists } = await import('@/lib/eyeTestAppointments')
    vi.mocked(getOptometrists).mockResolvedValueOnce([makeOptometrist()])

    await renderEyeTestPage({ error: 'This slot was just booked by someone else' })

    expect(screen.getByRole('alert')).toHaveTextContent('This slot was just booked by someone else')
  })

  it('falls back to the optometrist list for an unknown optometrist id', async () => {
    const { getOptometrists } = await import('@/lib/eyeTestAppointments')
    vi.mocked(getOptometrists).mockResolvedValueOnce([makeOptometrist()])

    await renderEyeTestPage({ optometrist: 'does-not-exist' })

    expect(screen.getByText('Dr. Ada Lovelace')).toBeInTheDocument()
    expect(screen.getByRole('link', { name: /select/i })).toBeInTheDocument()
  })
})
