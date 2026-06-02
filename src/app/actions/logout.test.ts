import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import * as NextHeaders from 'next/headers'
import * as NextNavigation from 'next/navigation'
import { logoutAction } from './logout'

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

describe('logoutAction', () => {
  it('deletes the session cookie and redirects to /login', async () => {
    await logoutAction()

    expect(mockDelete).toHaveBeenCalledWith('session')
    expect(NextNavigation.redirect).toHaveBeenCalledWith('/login')
  })
})
