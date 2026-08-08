import { describe, it, expect } from 'vitest'
import { OPS_CONSOLE_ROLES, isOpsConsolePath } from './roles'
import { REVIEWER_ROLES } from './prescriptionAccess'

describe('OPS_CONSOLE_ROLES', () => {
  it('admits ops, the role the console exists for', () => {
    expect(OPS_CONSOLE_ROLES).toContain('ops')
  })

  it('admits admin', () => {
    expect(OPS_CONSOLE_ROLES).toContain('admin')
  })

  // The ops console shows dispatch queues and the access-log trail, not
  // clinical judgement. An optometrist's job is the prescription review queue,
  // which keeps REVIEWER_ROLES.
  it('does not admit optometrist', () => {
    expect(OPS_CONSOLE_ROLES).not.toContain('optometrist')
  })

  it('does not admit a customer or a partner optometrist', () => {
    expect(OPS_CONSOLE_ROLES).not.toContain('customer')
    expect(OPS_CONSOLE_ROLES).not.toContain('partner_optometrist')
  })

  // The two sets are deliberately different, and admin is the only overlap.
  it('overlaps the clinical reviewer roles only on admin', () => {
    const shared = OPS_CONSOLE_ROLES.filter((role) => REVIEWER_ROLES.includes(role))
    expect(shared).toEqual(['admin'])
  })
})

describe('isOpsConsolePath', () => {
  it.each(['/admin/compliance', '/admin/orders', '/admin/support'])('claims %s', (path) => {
    expect(isOpsConsolePath(path)).toBe(true)
  })

  // These are clinical, not operational. Routing them through the ops gate
  // would lock optometrists out of the queue that is their actual job.
  it.each([
    '/admin/prescriptions',
    '/admin/prescriptions/00000000-0000-4000-8000-000000000000',
    '/admin/prescriptions/00000000-0000-4000-8000-000000000000/access-log',
    '/admin/partners',
  ])('leaves %s to the clinical gate', (path) => {
    expect(isOpsConsolePath(path)).toBe(false)
  })

  it('matches nested paths under an ops console route', () => {
    expect(isOpsConsolePath('/admin/orders/anything')).toBe(true)
  })

  // Prefix matching must not let a lookalike path in.
  it('does not match a path that merely starts with the same letters', () => {
    expect(isOpsConsolePath('/admin/ordersomething')).toBe(false)
    expect(isOpsConsolePath('/admin/supportive')).toBe(false)
  })

  it('does not claim non-admin paths', () => {
    expect(isOpsConsolePath('/account')).toBe(false)
    expect(isOpsConsolePath('/partner-portal')).toBe(false)
  })
})
