import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, it, expect } from 'vitest'
import { ProductGallery } from './ProductGallery'
import type { ProductImage } from '@/types'

function image(overrides: Partial<ProductImage> = {}): ProductImage {
  return {
    id: 'img-1', productId: 'prod-1', url: 'https://cdn.example/1.jpg',
    alt: 'Front view', sortOrder: 0, createdAt: new Date(),
    ...overrides,
  }
}

describe('ProductGallery — multiple images', () => {
  const images = [
    image({ id: 'img-1', url: 'https://cdn.example/1.jpg', alt: 'Front view', sortOrder: 0 }),
    image({ id: 'img-2', url: 'https://cdn.example/2.jpg', alt: 'Side view', sortOrder: 1 }),
    image({ id: 'img-3', url: 'https://cdn.example/3.jpg', alt: 'Case included', sortOrder: 2 }),
  ]

  it('renders the first image as the main image, using its real alt text', () => {
    render(<ProductGallery images={images} fallbackUrl={null} productName="Classic Frame" />)

    const main = within(screen.getByTestId('gallery-main-image')).getByRole('img', { name: 'Front view' })
    expect(main).toHaveAttribute('src', expect.stringContaining('cdn.example%2F1.jpg'))
  })

  it('renders a thumbnail for every image, in order', () => {
    render(<ProductGallery images={images} fallbackUrl={null} productName="Classic Frame" />)

    const thumbnails = screen.getAllByRole('tab')
    expect(thumbnails).toHaveLength(3)
    expect(thumbnails[0]).toHaveAccessibleName(/1 of 3/)
    expect(thumbnails[1]).toHaveAccessibleName(/2 of 3/)
    expect(thumbnails[2]).toHaveAccessibleName(/3 of 3/)
  })

  it('switches the main image when a thumbnail is clicked', async () => {
    render(<ProductGallery images={images} fallbackUrl={null} productName="Classic Frame" />)

    await userEvent.click(screen.getByRole('tab', { name: /2 of 3/ }))

    expect(
      within(screen.getByTestId('gallery-main-image')).getByRole('img', { name: 'Side view' })
    ).toBeInTheDocument()
  })

  it('marks the active thumbnail via aria-selected', async () => {
    render(<ProductGallery images={images} fallbackUrl={null} productName="Classic Frame" />)

    const [first, second] = screen.getAllByRole('tab')
    expect(first).toHaveAttribute('aria-selected', 'true')
    expect(second).toHaveAttribute('aria-selected', 'false')

    await userEvent.click(second)

    expect(first).toHaveAttribute('aria-selected', 'false')
    expect(second).toHaveAttribute('aria-selected', 'true')
  })

  it('falls back to the product name for a thumbnail alt when the column is null', () => {
    const withNullAlt = [image({ alt: null })]
    render(<ProductGallery images={withNullAlt} fallbackUrl={null} productName="Classic Frame" />)

    expect(screen.getByRole('img', { name: 'Classic Frame' })).toBeInTheDocument()
  })
})

describe('ProductGallery — single image', () => {
  it('renders the one image with no thumbnail strip', () => {
    render(<ProductGallery images={[image()]} fallbackUrl={null} productName="Classic Frame" />)

    expect(screen.getByRole('img', { name: 'Front view' })).toBeInTheDocument()
    expect(screen.queryAllByRole('tab')).toHaveLength(0)
  })
})

describe('ProductGallery — no product_images rows (not backfilled)', () => {
  it('falls back to the product.imageUrl single-image behavior', () => {
    render(
      <ProductGallery
        images={[]}
        fallbackUrl="https://cdn.example/legacy.jpg"
        productName="Classic Frame"
      />
    )

    expect(screen.getByRole('img', { name: 'Classic Frame' })).toHaveAttribute(
      'src', expect.stringContaining('legacy.jpg')
    )
    expect(screen.queryAllByRole('tab')).toHaveLength(0)
  })

  it('renders the placeholder icon when there is neither product_images nor an imageUrl', () => {
    render(<ProductGallery images={[]} fallbackUrl={null} productName="Classic Frame" />)

    expect(screen.queryByRole('img')).not.toBeInTheDocument()
    expect(screen.getByTestId('gallery-placeholder')).toBeInTheDocument()
  })
})
