import { vi, describe, it, expect, beforeEach } from 'vitest'
import { mockSql } from '@/test/dbMock'

vi.mock('./db', () => ({ sql: vi.fn() }))

describe('createCustomer', () => {
  beforeEach(() => { vi.resetModules(); vi.clearAllMocks() })

  it('inserts a customer and returns it', async () => {
    const { sql } = await import('./db')
    const now = new Date()
    mockSql(sql).mockResolvedValueOnce([{
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

  // ST-021 (EP-007): partner onboarding creates the account with
  // role='partner_optometrist' directly, not via a separate role-upgrade
  // step after the fact.
  it('inserts the given role when one is provided', async () => {
    const { sql } = await import('./db')
    const spy = mockSql(sql)
    spy.mockResolvedValueOnce([{
      id: 'cust-002', email: 'clinic@example.com', password_hash: 'hashed_pw',
      first_name: 'Priya', last_name: 'Sharma', phone: null,
      role: 'partner_optometrist', created_at: new Date(), updated_at: new Date(),
    }])

    const { createCustomer } = await import('./customers')
    const result = await createCustomer({
      email: 'clinic@example.com', passwordHash: 'hashed_pw',
      firstName: 'Priya', lastName: 'Sharma', role: 'partner_optometrist',
    })

    expect(result.role).toBe('partner_optometrist')
    const params = spy.mock.calls[0].slice(1)
    expect(params).toContain('partner_optometrist')
  })
})

describe('getCustomerByEmail', () => {
  beforeEach(() => { vi.resetModules(); vi.clearAllMocks() })

  it('returns a customer when found by email', async () => {
    const { sql } = await import('./db')
    const now = new Date()
    mockSql(sql).mockResolvedValueOnce([{
      id: 'cust-001',
      email: 'jane@example.com',
      password_hash: 'hashed_pw',
      first_name: 'Jane',
      last_name: 'Doe',
      phone: null,
      role: 'customer',
      created_at: now,
      updated_at: now,
    }])

    const { getCustomerByEmail } = await import('./customers')
    const result = await getCustomerByEmail('jane@example.com')

    expect(result?.email).toBe('jane@example.com')
    expect(result?.passwordHash).toBe('hashed_pw')
    expect(result?.role).toBe('customer')
  })

  it('returns null when no customer matches the email', async () => {
    const { sql } = await import('./db')
    mockSql(sql).mockResolvedValueOnce([])

    const { getCustomerByEmail } = await import('./customers')
    const result = await getCustomerByEmail('unknown@example.com')

    expect(result).toBeNull()
  })

  it('returns optometrist role when DB row has role optometrist', async () => {
    const { sql } = await import('./db')
    mockSql(sql).mockResolvedValueOnce([{
      id: 'cust-002',
      email: 'dr.patel@example.com',
      password_hash: 'hashed_pw',
      first_name: 'Priya',
      last_name: 'Patel',
      phone: null,
      role: 'optometrist',
      created_at: new Date(),
      updated_at: new Date(),
    }])

    const { getCustomerByEmail } = await import('./customers')
    const result = await getCustomerByEmail('dr.patel@example.com')

    expect(result?.role).toBe('optometrist')
  })
})

describe('getCustomerById', () => {
  beforeEach(() => { vi.resetModules(); vi.clearAllMocks() })

  it('returns a customer with role when found by id', async () => {
    const { sql } = await import('./db')
    mockSql(sql).mockResolvedValueOnce([{
      id: 'cust-001',
      email: 'jane@example.com',
      password_hash: 'hashed_pw',
      first_name: 'Jane',
      last_name: 'Doe',
      phone: null,
      role: 'customer',
      created_at: new Date(),
      updated_at: new Date(),
    }])

    const { getCustomerById } = await import('./customers')
    const result = await getCustomerById('cust-001')

    expect(result?.id).toBe('cust-001')
    expect(result?.role).toBe('customer')
  })

  it('returns null when not found', async () => {
    const { sql } = await import('./db')
    mockSql(sql).mockResolvedValueOnce([])

    const { getCustomerById } = await import('./customers')
    expect(await getCustomerById('nonexistent')).toBeNull()
  })
})
