import { vi, describe, it, expect, beforeEach } from 'vitest'
import { hashPassword, verifyPassword } from './auth'

vi.mock('./customers', () => ({
  createCustomer: vi.fn(),
  getCustomerByEmail: vi.fn(),
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
      passwordHash: 'hashed_pw', firstName: 'Jane', lastName: 'Doe', role: 'customer',
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

describe('loginUser', () => {
  beforeEach(() => { vi.resetModules(); vi.clearAllMocks() })

  it('returns the customer when credentials are correct', async () => {
    const hash = await hashPassword('secret123')
    const { getCustomerByEmail } = await import('./customers')
    vi.mocked(getCustomerByEmail).mockResolvedValueOnce({
      id: 'cust-001', email: 'jane@example.com', passwordHash: hash,
      firstName: 'Jane', lastName: 'Doe', phone: null, role: 'customer',
      createdAt: new Date(), updatedAt: new Date(),
    })
    const { loginUser } = await import('./auth')
    expect((await loginUser('jane@example.com', 'secret123'))?.email).toBe('jane@example.com')
  })

  it('returns null when the password is wrong', async () => {
    const hash = await hashPassword('secret123')
    const { getCustomerByEmail } = await import('./customers')
    vi.mocked(getCustomerByEmail).mockResolvedValueOnce({
      id: 'cust-001', email: 'jane@example.com', passwordHash: hash,
      firstName: 'Jane', lastName: 'Doe', phone: null, role: 'customer',
      createdAt: new Date(), updatedAt: new Date(),
    })
    const { loginUser } = await import('./auth')
    expect(await loginUser('jane@example.com', 'wrongpassword')).toBeNull()
  })

  it('returns null when no customer exists for the email', async () => {
    const { getCustomerByEmail } = await import('./customers')
    vi.mocked(getCustomerByEmail).mockResolvedValueOnce(null)
    const { loginUser } = await import('./auth')
    expect(await loginUser('unknown@example.com', 'password')).toBeNull()
  })
})
