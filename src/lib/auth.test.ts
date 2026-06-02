import { describe, it, expect } from 'vitest'
import { hashPassword, verifyPassword } from './auth'

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
