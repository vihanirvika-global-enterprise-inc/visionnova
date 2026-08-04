import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import * as NextHeaders from 'next/headers'
import { createPendingLogin, getPendingLogin, clearPendingLogin } from './pendingLogin'

let mockSet: ReturnType<typeof vi.fn>
let mockGet: ReturnType<typeof vi.fn>
let mockDelete: ReturnType<typeof vi.fn>

beforeEach(() => {
  mockSet = vi.fn()
  mockGet = vi.fn()
  mockDelete = vi.fn()
  vi.spyOn(NextHeaders, 'cookies').mockReturnValue(
    { set: mockSet, get: mockGet, delete: mockDelete } as any
  )
})

afterEach(() => {
  vi.restoreAllMocks()
})

// ST-013: this cookie exists specifically so the password step and the OTP
// step aren't the same request — password-verified identity has to survive
// the redirect to /login/verify-otp without becoming a real session yet.
describe('pendingLogin', () => {
  it('createPendingLogin sets an HTTP-only cookie, distinct from the real session cookie', () => {
    createPendingLogin('customer-123', 'customer')

    expect(mockSet).toHaveBeenCalledWith(
      'pending_login',
      expect.any(String),
      expect.objectContaining({ httpOnly: true })
    )
  })

  it('getPendingLogin returns customerId and role from a valid cookie', () => {
    createPendingLogin('customer-123', 'customer')
    const token = mockSet.mock.calls[0][1] as string
    mockGet.mockReturnValue({ value: token })

    expect(getPendingLogin()).toEqual({ customerId: 'customer-123', role: 'customer' })
  })

  it('getPendingLogin returns null when no cookie is present', () => {
    mockGet.mockReturnValue(undefined)

    expect(getPendingLogin()).toBeNull()
  })

  it('getPendingLogin returns null for a tampered cookie', () => {
    createPendingLogin('customer-123', 'customer')
    const token = mockSet.mock.calls[0][1] as string
    const [data] = token.split('.')
    mockGet.mockReturnValue({ value: `${data}.forgedsignature` })

    expect(getPendingLogin()).toBeNull()
  })

  it('clearPendingLogin deletes the pending login cookie', () => {
    clearPendingLogin()

    expect(mockDelete).toHaveBeenCalledWith('pending_login')
  })
})
