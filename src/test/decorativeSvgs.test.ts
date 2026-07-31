import { describe, it, expect } from 'vitest'
import { readdirSync, readFileSync, statSync } from 'fs'
import { join } from 'path'

const SRC = join(process.cwd(), 'src')

function tsxFiles(dir: string): string[] {
  return readdirSync(dir).flatMap((entry) => {
    const full = join(dir, entry)
    if (statSync(full).isDirectory()) return tsxFiles(full)
    return full.endsWith('.tsx') && !full.includes('.test.') ? [full] : []
  })
}

// Matches an <svg ...> opening tag, including the multi-line form:
// [^>] already spans newlines, so no dotAll flag is needed.
const SVG_OPEN = /<svg\b[^>]*>/g

function unlabelledSvgs(source: string): string[] {
  return (source.match(SVG_OPEN) ?? []).filter(
    (tag) =>
      !tag.includes('aria-hidden') &&
      !tag.includes('aria-label') &&
      !tag.includes('role="img"')
  )
}

// Every inline icon in this app is decorative — the surrounding link, button or
// text already carries the meaning. Left exposed, screen readers announce each
// one as an unnamed graphic. Enforcing it here rather than per component means a
// new icon cannot quietly reintroduce the noise.
describe('decorative SVGs', () => {
  const offenders = tsxFiles(SRC)
    .map((file) => ({ file, tags: unlabelledSvgs(readFileSync(file, 'utf8')) }))
    .filter(({ tags }) => tags.length > 0)

  it('are all hidden from assistive technology', () => {
    const report = offenders
      .map(({ file, tags }) => `${file.replace(SRC, 'src')} (${tags.length})`)
      .join('\n')

    expect(report).toBe('')
  })

  it('checks a meaningful number of files', () => {
    expect(tsxFiles(SRC).length).toBeGreaterThan(20)
  })
})
