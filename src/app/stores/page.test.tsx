import { render, screen } from '@testing-library/react'
import { vi, describe, it, expect, beforeEach } from 'vitest'

vi.mock('@/lib/stores', () => ({ getPartnerStores: vi.fn() }))

function makeStore(overrides: Record<string, unknown> = {}) {
  return {
    id: 'store-001',
    name: 'VisionNova Partner — Koramangala',
    addressLine1: '123 80 Feet Road',
    addressLine2: null,
    city: 'Bengaluru',
    state: 'Karnataka',
    postalCode: '560034',
    phone: '+91-80-1234-5678',
    createdAt: new Date(),
    ...overrides,
  }
}

async function renderStoresPage(searchParams: Record<string, string> = {}) {
  const StoresPage = (await import('./page')).default
  render(await StoresPage({ searchParams }))
}

describe('StoresPage', () => {
  beforeEach(() => { vi.resetModules(); vi.clearAllMocks() })

  it('renders a list of partner stores', async () => {
    const { getPartnerStores } = await import('@/lib/stores')
    vi.mocked(getPartnerStores).mockResolvedValueOnce([makeStore()])

    await renderStoresPage()

    expect(screen.getByText('VisionNova Partner — Koramangala')).toBeInTheDocument()
    expect(screen.getByText(/123 80 Feet Road/)).toBeInTheDocument()
    expect(screen.getByText('+91-80-1234-5678')).toBeInTheDocument()
  })

  it('shows an empty state when there are no partner stores at all', async () => {
    const { getPartnerStores } = await import('@/lib/stores')
    vi.mocked(getPartnerStores).mockResolvedValueOnce([])

    await renderStoresPage()

    expect(screen.getByText('No partner stores listed yet')).toBeInTheDocument()
  })

  it('shows a city-specific empty state when a search yields nothing', async () => {
    const { getPartnerStores } = await import('@/lib/stores')
    vi.mocked(getPartnerStores).mockResolvedValueOnce([])

    await renderStoresPage({ city: 'Nowhereville' })

    expect(screen.getByText('No stores found in "Nowhereville"')).toBeInTheDocument()
  })

  it('passes the city param through to getPartnerStores', async () => {
    const { getPartnerStores } = await import('@/lib/stores')
    vi.mocked(getPartnerStores).mockResolvedValueOnce([makeStore({ city: 'Mumbai' })])

    await renderStoresPage({ city: 'Mumbai' })

    expect(getPartnerStores).toHaveBeenCalledWith('Mumbai')
  })

  it('does not render a phone line when the store has none on file', async () => {
    const { getPartnerStores } = await import('@/lib/stores')
    vi.mocked(getPartnerStores).mockResolvedValueOnce([makeStore({ phone: null })])

    await renderStoresPage()

    expect(screen.queryByText(/^\+91/)).not.toBeInTheDocument()
  })
})
