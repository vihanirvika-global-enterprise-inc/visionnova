import { describe, it, expect } from 'vitest'
import resolveConfig from 'tailwindcss/resolveConfig'
import config from './tailwind.config'

const resolved = resolveConfig(config)

// tailwindcss/resolveConfig's return type is the static DefaultColors shape —
// it has no way to know theme.extend replaced some of those keys with plain
// strings, so the actually-resolved values need a runtime-honest type here
// rather than fighting the (necessarily approximate) static one.
const colors = resolved.theme.colors as unknown as Record<string, string>

describe('tailwind design tokens', () => {
  it('resolves the brand color tokens to the locked design values', () => {
    expect(colors.primary).toBe('#1E3A8A')
    expect(colors.teal).toBe('#0E7C7B')
    expect(colors.terracotta).toBe('#C4643C')
    expect(colors.canvas).toBe('#FBFAF8')
  })

  it('does not clobber Tailwind default colors when adding brand tokens', () => {
    // proves the tokens were added under theme.extend, not theme,
    // since replacing theme.colors wholesale would delete these
    expect(colors.white).toBe('#fff')
    expect(colors.black).toBe('#000')
  })

  it('resolves the sans and mono font stacks to the locked design fonts', () => {
    expect(resolved.theme.fontFamily.sans[0]).toMatch(/Plus Jakarta Sans/)
    expect(resolved.theme.fontFamily.mono[0]).toMatch(/IBM Plex Mono/)
  })
})
