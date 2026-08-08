// Shared so every axe assertion in the suite runs the same rulesets. When this
// list changes it must change once, not in each file that happens to call axe.
//
// jsdom cannot compute real layout, so color-contrast is off here — Lighthouse
// CI covers it against the really-rendered page (BUG-011).
export const AXE_OPTIONS = {
  runOnly: { type: 'tag' as const, values: ['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa'] },
  rules: { 'color-contrast': { enabled: false } },
}
