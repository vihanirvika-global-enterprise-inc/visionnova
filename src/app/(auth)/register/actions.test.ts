import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import * as NextHeaders from 'next/headers'
import * as NextNavigation from 'next/navigation'
import * as Auth from '@/lib/auth'
import { registerAction } from './actions'

vi.mock('@/lib/auth', () => ({
  registerUser: vi.fn(),
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

const validFields = {
  firstName: 'Ada', lastName: 'Lovelace',
  email: 'ada@example.com', password: 'password123',
}

describe('registerAction', () => {
  it('returns a field error when email is invalid', async () => {
    const result = await registerAction(
      makeFormData({ ...validFields, email: 'not-an-email' })
    )

    expect(result).toEqual({ error: expect.any(String) })
    expect(Auth.registerUser).not.toHaveBeenCalled()
  })

  it('returns an error when password is too short', async () => {
    const result = await registerAction(
      makeFormData({ ...validFields, password: 'short' })
    )

    expect(result).toEqual({ error: expect.any(String) })
    expect(Auth.registerUser).not.toHaveBeenCalled()
  })

  it('sets a session cookie and redirects on successful registration', async () => {
    vi.mocked(Auth.registerUser).mockResolvedValue({
      id: 'cust-1', email: 'ada@example.com',
      firstName: 'Ada', lastName: 'Lovelace',
      passwordHash: 'hash', phone: null,
      createdAt: new Date(), updatedAt: new Date(),
    })

    await registerAction(makeFormData(validFields))

    expect(mockSet).toHaveBeenCalledWith(
      'session', expect.any(String), expect.objectContaining({ httpOnly: true })
    )
    expect(NextNavigation.redirect).toHaveBeenCalledWith('/account')
  })
})
