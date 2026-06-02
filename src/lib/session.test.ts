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

describe('session', () => {
  it('createSession sets an HTTP-only cookie', () => {
    createSession('customer-123')

    expect(mockSet).toHaveBeenCalledWith(
      'session',
      expect.any(String),
      expect.objectContaining({ httpOnly: true })
    )
  })

  it('getSession returns customerId from a valid cookie', () => {
    createSession('customer-123')
    const token = mockSet.mock.calls[0][1] as string
    mockGet.mockReturnValue({ value: token })

    expect(getSession()).toEqual({ customerId: 'customer-123' })
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
