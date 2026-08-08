import { describe, it, expect } from 'vitest'
import { isUuid } from './uuid'

describe('isUuid', () => {
  it('accepts a canonical uuid', () => {
    expect(isUuid('3f2a1b6c-9d4e-4a71-8c05-2e6b7d9a1f34')).toBe(true)
  })

  it('accepts uppercase hex', () => {
    expect(isUuid('3F2A1B6C-9D4E-4A71-8C05-2E6B7D9A1F34')).toBe(true)
  })

  it.each([
    ['empty', ''],
    ['a slug', 'order-1'],
    ['path traversal', '../../etc/passwd'],
    ['sql-ish', "' OR 1=1--"],
    ['too short', '3f2a1b6c-9d4e-4a71-8c05-2e6b7d9a1f3'],
    ['too long', '3f2a1b6c-9d4e-4a71-8c05-2e6b7d9a1f345'],
    ['no hyphens', '3f2a1b6c9d4e4a718c052e6b7d9a1f34'],
    ['non-hex', 'zzzzzzzz-9d4e-4a71-8c05-2e6b7d9a1f34'],
    ['braced', '{3f2a1b6c-9d4e-4a71-8c05-2e6b7d9a1f34}'],
  ])('rejects %s', (_label, value) => {
    expect(isUuid(value)).toBe(false)
  })

  // Anchored on both ends: without that, a valid uuid with junk appended would
  // pass the check and then reach the query anyway.
  it('rejects a valid uuid with anything appended', () => {
    expect(isUuid('3f2a1b6c-9d4e-4a71-8c05-2e6b7d9a1f34/../admin')).toBe(false)
  })

  it('rejects a valid uuid with a newline appended', () => {
    expect(isUuid('3f2a1b6c-9d4e-4a71-8c05-2e6b7d9a1f34\n')).toBe(false)
  })
})
