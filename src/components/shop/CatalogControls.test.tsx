import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, it, expect, vi, beforeEach } from 'vitest'

const mockPush = vi.fn()
let mockSearchParams = new URLSearchParams()

vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: mockPush }),
  usePathname: () => '/shop',
  useSearchParams: () => mockSearchParams,
}))

import { CatalogControls } from './CatalogControls'

beforeEach(() => {
  vi.clearAllMocks()
  mockSearchParams = new URLSearchParams()
})

describe('CatalogControls', () => {
  it('starts empty when there is no q param', () => {
    render(<CatalogControls />)
    expect(screen.getByRole('searchbox', { name: /search eyewear/i })).toHaveValue('')
  })

  it('prefills the search input from the current q param', () => {
    mockSearchParams = new URLSearchParams('q=aviator')
    render(<CatalogControls />)
    expect(screen.getByRole('searchbox', { name: /search eyewear/i })).toHaveValue('aviator')
  })

  it('navigates to /shop?q=... when the search form is submitted', async () => {
    render(<CatalogControls />)

    await userEvent.type(screen.getByRole('searchbox', { name: /search eyewear/i }), 'aviator')
    await userEvent.click(screen.getByRole('button', { name: /search/i }))

    expect(mockPush).toHaveBeenCalledWith('/shop?q=aviator')
  })

  it('removes the q param entirely when the search is cleared', async () => {
    mockSearchParams = new URLSearchParams('q=aviator')
    render(<CatalogControls />)

    const input = screen.getByRole('searchbox', { name: /search eyewear/i })
    await userEvent.clear(input)
    await userEvent.click(screen.getByRole('button', { name: /search/i }))

    expect(mockPush).toHaveBeenCalledWith('/shop')
  })

  it('resets the page param when a new search is submitted', async () => {
    mockSearchParams = new URLSearchParams('page=3')
    render(<CatalogControls />)

    await userEvent.type(screen.getByRole('searchbox', { name: /search eyewear/i }), 'aviator')
    await userEvent.click(screen.getByRole('button', { name: /search/i }))

    expect(mockPush).toHaveBeenCalledWith('/shop?q=aviator')
  })

  it('defaults the sort dropdown to newest when no sort param is present', () => {
    render(<CatalogControls />)
    expect(screen.getByRole('combobox', { name: /sort by/i })).toHaveValue('newest')
  })

  it('reflects the current sort param', () => {
    mockSearchParams = new URLSearchParams('sort=price_asc')
    render(<CatalogControls />)
    expect(screen.getByRole('combobox', { name: /sort by/i })).toHaveValue('price_asc')
  })

  it('navigates preserving the existing q param when sort changes', async () => {
    mockSearchParams = new URLSearchParams('q=aviator')
    render(<CatalogControls />)

    await userEvent.selectOptions(screen.getByRole('combobox', { name: /sort by/i }), 'price_asc')

    expect(mockPush).toHaveBeenCalledWith('/shop?q=aviator&sort=price_asc')
  })

  it('omits the sort param from the URL when set back to newest', async () => {
    mockSearchParams = new URLSearchParams('sort=price_asc')
    render(<CatalogControls />)

    await userEvent.selectOptions(screen.getByRole('combobox', { name: /sort by/i }), 'newest')

    expect(mockPush).toHaveBeenCalledWith('/shop')
  })

  it('resets the page param when sort changes', async () => {
    mockSearchParams = new URLSearchParams('page=3')
    render(<CatalogControls />)

    await userEvent.selectOptions(screen.getByRole('combobox', { name: /sort by/i }), 'price_desc')

    expect(mockPush).toHaveBeenCalledWith('/shop?sort=price_desc')
  })
})
