import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import * as NextHeaders from 'next/headers'
import { createSession, getSession, deleteSession } from './session'

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


// Mints through createSession so the signature comes from the module's own
// secret rather than a process.env read the test environment does not provide.
function signTokenFor(customerId: string): string {
  createSession(customerId)
  return mockSet.mock.calls[mockSet.mock.calls.length - 1][1] as string
}

function mockCookie(value: string) {
  mockGet.mockReturnValue({ value })
}

describe('session', () => {
  it('createSession sets an HTTP-only cookie', () => {
    createSession('a58630d6-35ef-4135-8f79-c39c2e99fa4b')

    expect(mockSet).toHaveBeenCalledWith(
      'session',
      expect.any(String),
      expect.objectContaining({ httpOnly: true })
    )
  })

  it('getSession returns customerId from a valid cookie', () => {
    createSession('a58630d6-35ef-4135-8f79-c39c2e99fa4b')
    const token = mockSet.mock.calls[0][1] as string
    mockGet.mockReturnValue({ value: token })

    expect(getSession()).toEqual({ customerId: 'a58630d6-35ef-4135-8f79-c39c2e99fa4b', role: 'customer' })
  })

  it('getSession returns null when no cookie is present', () => {
    mockGet.mockReturnValue(undefined)

    expect(getSession()).toBeNull()
  })

  it('deleteSession deletes the session cookie', () => {
    deleteSession()

    expect(mockDelete).toHaveBeenCalledWith('session')
  })
})

// A signed cookie can outlive the id format. customer_id is a uuid column, so
// a session carrying anything else is not merely useless — it reaches Postgres
// through the root layout's wishlist provider, before any page guard runs, and
// 500s every authenticated route. Rejecting it here fails closed once, for
// every consumer.
describe('getSession — malformed customer id', () => {
  it('rejects a validly-signed session whose customerId is not a uuid', () => {
    // createSession does not validate its argument, so this is a genuinely
    // well-signed cookie carrying a stale id — the signature check passes and
    // the uuid guard is what must reject it. An earlier version of this test
    // swapped the payload under an old signature, so it failed at the
    // signature check and proved nothing.
    mockCookie(signTokenFor('cust-001'))

    expect(getSession()).toBeNull()
  })

  it('accepts a validly-signed session with a real uuid', () => {
    const id = 'a58630d6-35ef-4135-8f79-c39c2e99fa4b'
    mockCookie(signTokenFor(id))

    expect(getSession()?.customerId).toBe(id)
  })
})
