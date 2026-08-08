import { describe, it, expect } from 'vitest'
import { render } from '@testing-library/react'
import { axe } from 'jest-axe'
import { AXE_OPTIONS } from './axeOptions'
import { CartProvider } from '@/components/cart/CartContext'
import { Navbar } from '@/components/layout/Navbar'
import { Footer } from '@/components/layout/Footer'
import { MobileBottomNav } from '@/components/layout/MobileBottomNav'
import { FaqSearch } from '@/components/help/FaqSearch'
import { FAQ_SECTIONS } from '@/lib/faq'
import LoginPage from '@/app/(auth)/login/page'

// EP-010 BUG-008 (Risk TECH-07 — WCAG 2.1 AA). The automated half of the
// ticket's "automated + manual WCAG 2.1 AA audit": axe running the WCAG A/AA
// rulesets against the surfaces every customer journey passes through. This
// is a floor, not the audit — axe catches roughly a third of WCAG failures
// (missing labels, roles, structure); color contrast in real rendering,
// keyboard traps, and screen-reader flow still need the manual pass the
// ticket also calls for. jsdom cannot compute real layout, so the
// color-contrast rule is off here — Lighthouse CI covers it against the
// really-rendered page (BUG-011).
// The option set moved to ./axeOptions so the catalogue guards run the same
// rulesets — two definitions of "accessible" in one suite is worse than none.


describe('WCAG 2.1 AA automated checks', () => {
  it('Navbar has no violations', async () => {
    const { container } = render(
      <CartProvider>
        <Navbar />
      </CartProvider>
    )

    expect((await axe(container, AXE_OPTIONS)).violations).toEqual([])
  })

  it('Footer has no violations', async () => {
    const { container } = render(<Footer />)

    expect((await axe(container, AXE_OPTIONS)).violations).toEqual([])
  })

  it('MobileBottomNav has no violations', async () => {
    const { container } = render(
      <CartProvider>
        <MobileBottomNav />
      </CartProvider>
    )

    expect((await axe(container, AXE_OPTIONS)).violations).toEqual([])
  })

  it('Login page has no violations', async () => {
    const { container } = render(<LoginPage />)

    expect((await axe(container, AXE_OPTIONS)).violations).toEqual([])
  })

  it('FAQ search has no violations', async () => {
    const { container } = render(<FaqSearch sections={FAQ_SECTIONS} />)

    expect((await axe(container, AXE_OPTIONS)).violations).toEqual([])
  })
})
