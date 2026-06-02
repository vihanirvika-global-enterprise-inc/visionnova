import { vi, describe, it, expect, beforeEach } from 'vitest'
import { hashPassword, verifyPassword } from './auth'

vi.mock('./customers', () => ({
  createCustomer: vi.fn(),
}))

describe('auth utilities', () => {
  it('hashPassword returns a hash different from the input', async () => {
    const hash = await hashPassword('secret123')
    expect(hash).not.toBe('secret123')
    expect(hash.length).toBeGreaterThan(20)
  })

  it('verifyPassword returns true for the correct password', async () => {
    const hash = await hashPassword('secret123')
    expect(await verifyPassword('secret123', hash)).toBe(true)
  })

  it('verifyPassword returns false for the wrong password', async () => {
    const hash = await hashPassword('secret123')
    expect(await verifyPassword('wrongpassword', hash)).toBe(false)
  })
})

describe('registerUser', () => {
  beforeEach(() => { vi.resetModules(); vi.clearAllMocks() })

  it('creates a customer with a hashed password', async () => {
    const { createCustomer } = await import('./customers')
    vi.mocked(createCustomer).mockResolvedValueOnce({
      id: 'cust-001', email: 'jane@example.com',
      passwordHash: 'hashed_pw', firstName: 'Jane', lastName: 'Doe',
      phone: null, createdAt: new Date(), updatedAt: new Date(),
    })

    const { registerUser } = await import('./auth')
    const result = await registerUser({
      email: 'jane@example.com', password: 'secret123',
      firstName: 'Jane', lastName: 'Doe',
    })

    expect(vi.mocked(createCustomer).mock.calls[0][0].passwordHash).not.toBe('secret123')
    expect(result.email).toBe('jane@example.com')
  })
})
