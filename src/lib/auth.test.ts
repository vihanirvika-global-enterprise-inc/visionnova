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

  it('produces a different hash each time for the same input, proving salting is active', async () => {
    const [hashA, hashB] = await Promise.all([
      hashPassword('secret123'),
      hashPassword('secret123'),
    ])
    expect(hashA).not.toBe(hashB)
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

  // ST-021 (EP-007): partner onboarding reuses registerUser rather than
  // duplicating its password-hashing and duplicate-email handling.
  it('passes the given role through to createCustomer', async () => {
    const { createCustomer } = await import('./customers')
    vi.mocked(createCustomer).mockResolvedValueOnce({
      id: 'cust-002', email: 'clinic@example.com',
      passwordHash: 'hashed_pw', firstName: 'Priya', lastName: 'Sharma',
      role: 'partner_optometrist', phone: null, createdAt: new Date(), updatedAt: new Date(),
    })

    const { registerUser } = await import('./auth')
    await registerUser({
      email: 'clinic@example.com', password: 'secret123',
      firstName: 'Priya', lastName: 'Sharma', role: 'partner_optometrist',
    })

    expect(vi.mocked(createCustomer).mock.calls[0][0].role).toBe('partner_optometrist')
  })

  // The DB-level backstop for the race condition: two near-simultaneous
  // registrations for the same email can both pass validateRegistration's
  // precheck (neither has been inserted yet when the other checks), so the
  // second INSERT hitting the unique constraint has to be caught here too —
  // not just left to crash as a raw PostgresError.
  it('throws DuplicateEmailError when createCustomer hits the email unique constraint', async () => {
    const { createCustomer } = await import('./customers')
    vi.mocked(createCustomer).mockRejectedValueOnce(
      Object.assign(new Error('duplicate key value violates unique constraint "customers_email_key"'), {
        name: 'PostgresError',
        code: '23505',
        constraint_name: 'customers_email_key',
      })
    )

    // DuplicateEmailError destructured from this same dynamic import, not
    // the static top-level one: vi.resetModules() means the static import
    // and this fresh one are different module instances, so registerUser's
    // thrown error would fail instanceof against the "wrong" class object
    // even though both are genuinely DuplicateEmailError.
    const { registerUser, DuplicateEmailError: FreshDuplicateEmailError } = await import('./auth')
    await expect(
      registerUser({
        email: 'jane@example.com', password: 'secret123',
        firstName: 'Jane', lastName: 'Doe',
      })
      // toBeInstanceOf, not toThrow(DuplicateEmailError): toThrow() with an
      // undefined class reference silently degrades to "threw something,
      // don't care what" instead of failing — exactly the false-negative
      // trap this needs to avoid while DuplicateEmailError doesn't exist yet.
    ).rejects.toBeInstanceOf(FreshDuplicateEmailError)
  })

  it('does not misclassify an unrelated database error as DuplicateEmailError', async () => {
    const { createCustomer } = await import('./customers')
    const unrelatedError = Object.assign(new Error('connection terminated'), {
      name: 'PostgresError',
      code: '57P01',
    })
    vi.mocked(createCustomer).mockRejectedValueOnce(unrelatedError)

    const { registerUser } = await import('./auth')
    await expect(
      registerUser({
        email: 'jane@example.com', password: 'secret123',
        firstName: 'Jane', lastName: 'Doe',
      })
    ).rejects.toBe(unrelatedError)
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
