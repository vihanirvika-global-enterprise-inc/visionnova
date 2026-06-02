import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import * as NextHeaders from 'next/headers'
import * as NextNavigation from 'next/navigation'
import * as Auth from '@/lib/auth'
import { loginAction } from './actions'

vi.mock('@/lib/auth', () => ({
  loginUser: vi.fn(),
}))

vi.mock('next/navigation', () => ({
  redirect: vi.fn(),
}))

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

function makeFormData(fields: Record<string, string>): FormData {
  const fd = new FormData()
  Object.entries(fields).forEach(([k, v]) => fd.append(k, v))
  return fd
}

describe('loginAction', () => {
  it('returns a field error when email is invalid', async () => {
    const result = await loginAction(
      makeFormData({ email: 'not-an-email', password: 'password123' })
    )

    expect(result).toEqual({ error: expect.any(String) })
    expect(Auth.loginUser).not.toHaveBeenCalled()
  })

  it('returns an error when credentials are wrong', async () => {
    vi.mocked(Auth.loginUser).mockResolvedValue(null)

    const result = await loginAction(
      makeFormData({ email: 'user@example.com', password: 'wrongpass' })
    )

    expect(result).toEqual({ error: expect.any(String) })
  })

  it('sets a session cookie and redirects on valid credentials', async () => {
    vi.mocked(Auth.loginUser).mockResolvedValue({
      id: 'cust-1', email: 'user@example.com',
      firstName: 'Ada', lastName: 'Lovelace',
      passwordHash: 'hash', phone: null,
      createdAt: new Date(), updatedAt: new Date(),
    })

    await loginAction(
      makeFormData({ email: 'user@example.com', password: 'correctpass' })
    )

    expect(mockSet).toHaveBeenCalledWith(
      'session', expect.any(String), expect.objectContaining({ httpOnly: true })
    )
    expect(NextNavigation.redirect).toHaveBeenCalledWith('/account')
  })
})
