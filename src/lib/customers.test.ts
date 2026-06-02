import { vi, describe, it, expect, beforeEach } from 'vitest'

vi.mock('./db', () => ({ sql: vi.fn() }))

describe('createCustomer', () => {
  beforeEach(() => { vi.resetModules(); vi.clearAllMocks() })

  it('inserts a customer and returns it', async () => {
    const { sql } = await import('./db')
    const now = new Date()
    vi.mocked(sql).mockResolvedValueOnce([{
      id: 'cust-001',
      email: 'jane@example.com',
      password_hash: 'hashed_pw',
      first_name: 'Jane',
      last_name: 'Doe',
      phone: null,
      created_at: now,
      updated_at: now,
    }])

    const { createCustomer } = await import('./customers')
    const result = await createCustomer({
      email: 'jane@example.com',
      passwordHash: 'hashed_pw',
      firstName: 'Jane',
      lastName: 'Doe',
    })

    expect(sql).toHaveBeenCalledOnce()
    expect(result.id).toBe('cust-001')
    expect(result.email).toBe('jane@example.com')
    expect(result.firstName).toBe('Jane')
  })
})

describe('getCustomerByEmail', () => {
  beforeEach(() => { vi.resetModules(); vi.clearAllMocks() })

  it('returns a customer when found by email', async () => {
    const { sql } = await import('./db')
    const now = new Date()
    vi.mocked(sql).mockResolvedValueOnce([{
      id: 'cust-001',
      email: 'jane@example.com',
      password_hash: 'hashed_pw',
      first_name: 'Jane',
      last_name: 'Doe',
      phone: null,
      created_at: now,
      updated_at: now,
    }])

    const { getCustomerByEmail } = await import('./customers')
    const result = await getCustomerByEmail('jane@example.com')

    expect(result?.email).toBe('jane@example.com')
    expect(result?.passwordHash).toBe('hashed_pw')
  })

  it('returns null when no customer matches the email', async () => {
    const { sql } = await import('./db')
    vi.mocked(sql).mockResolvedValueOnce([])

    const { getCustomerByEmail } = await import('./customers')
    const result = await getCustomerByEmail('unknown@example.com')

    expect(result).toBeNull()
  })
})
