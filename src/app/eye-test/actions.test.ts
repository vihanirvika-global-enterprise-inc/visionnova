import { describe, it, expect, vi, beforeEach } from 'vitest'
import * as EyeTestAppointments from '@/lib/eyeTestAppointments'
import * as NextNavigation from 'next/navigation'
import * as Session from '@/lib/session'
import { bookAppointmentAction } from './actions'

vi.mock('@/lib/eyeTestAppointments', async () => {
  const actual = await vi.importActual<typeof import('@/lib/eyeTestAppointments')>(
    '@/lib/eyeTestAppointments'
  )
  return { ...actual, createAppointment: vi.fn() }
})
vi.mock('next/navigation', () => ({
  redirect: vi.fn(() => { throw new Error('NEXT_REDIRECT') }),
}))
vi.mock('@/lib/session', () => ({ getSession: vi.fn() }))

function makeFormData(overrides: Record<string, string> = {}): FormData {
  const fd = new FormData()
  fd.set('optometristId', 'opt-1')
  fd.set('scheduledAt', '2026-03-02T10:00:00.000Z')
  for (const [key, value] of Object.entries(overrides)) fd.set(key, value)
  return fd
}

describe('bookAppointmentAction', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.mocked(Session.getSession).mockReturnValue({ customerId: 'cust-1', role: 'customer' })
  })

  it('redirects back with an error when there is no session', async () => {
    vi.mocked(Session.getSession).mockReturnValue(null)

    await expect(bookAppointmentAction(makeFormData())).rejects.toThrow('NEXT_REDIRECT')

    expect(EyeTestAppointments.createAppointment).not.toHaveBeenCalled()
    const [url] = vi.mocked(NextNavigation.redirect).mock.calls[0]
    expect(url).toContain('/eye-test?optometrist=opt-1')
    expect(url).toContain('error=')
  })

  it('redirects to /eye-test when no optometrist was selected', async () => {
    await expect(bookAppointmentAction(new FormData())).rejects.toThrow('NEXT_REDIRECT')

    expect(EyeTestAppointments.createAppointment).not.toHaveBeenCalled()
    expect(NextNavigation.redirect).toHaveBeenCalledWith('/eye-test')
  })

  it('books the appointment and redirects to /account on success', async () => {
    vi.mocked(EyeTestAppointments.createAppointment).mockResolvedValue({
      id: 'appt-1', customerId: 'cust-1', optometristId: 'opt-1',
      scheduledAt: new Date('2026-03-02T10:00:00.000Z'), status: 'scheduled', createdAt: new Date(),
    })

    await expect(bookAppointmentAction(makeFormData())).rejects.toThrow('NEXT_REDIRECT')

    expect(EyeTestAppointments.createAppointment).toHaveBeenCalledWith(
      'cust-1', 'opt-1', new Date('2026-03-02T10:00:00.000Z')
    )
    expect(NextNavigation.redirect).toHaveBeenCalledWith('/account')
  })

  it('redirects back to the optometrist slot view with a friendly error when the slot was just taken', async () => {
    vi.mocked(EyeTestAppointments.createAppointment).mockRejectedValue(
      new EyeTestAppointments.SlotAlreadyBookedError()
    )

    await expect(bookAppointmentAction(makeFormData())).rejects.toThrow('NEXT_REDIRECT')

    const [url] = vi.mocked(NextNavigation.redirect).mock.calls[0]
    expect(url).toContain('/eye-test?optometrist=opt-1')
    expect(url).toContain(encodeURIComponent('This slot was just booked by someone else'))
  })

  it('re-throws an unrelated error rather than swallowing it as a slot conflict', async () => {
    vi.mocked(EyeTestAppointments.createAppointment).mockRejectedValue(new Error('db down'))

    await expect(bookAppointmentAction(makeFormData())).rejects.toThrow('db down')
  })
})
