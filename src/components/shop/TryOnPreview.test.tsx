import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { TryOnPreview } from './TryOnPreview'

beforeEach(() => {
  URL.createObjectURL = vi.fn(() => 'blob:mock-photo-url')
  URL.revokeObjectURL = vi.fn()
})

afterEach(() => vi.restoreAllMocks())

function makePhotoFile(): File {
  return new File(['fake-image-bytes'], 'me.jpg', { type: 'image/jpeg' })
}

describe('TryOnPreview', () => {
  it('renders an upload prompt before any photo is chosen', () => {
    render(<TryOnPreview frameImageUrl="https://cdn.example/frame.png" productName="Classic Frame" />)
    expect(screen.getByLabelText(/upload a photo/i)).toBeInTheDocument()
    expect(screen.queryByAltText(/your photo/i)).not.toBeInTheDocument()
  })

  it('renders the uploaded photo with the frame overlaid once a photo is chosen', async () => {
    render(<TryOnPreview frameImageUrl="https://cdn.example/frame.png" productName="Classic Frame" />)

    const input = screen.getByLabelText(/upload a photo/i)
    await userEvent.upload(input, makePhotoFile())

    await waitFor(() => {
      expect(screen.getByAltText(/your photo/i)).toHaveAttribute('src', 'blob:mock-photo-url')
    })
    expect(screen.getByAltText(/classic frame overlay/i)).toBeInTheDocument()
  })

  it('processes the photo entirely client-side via an object URL, never uploading it', async () => {
    render(<TryOnPreview frameImageUrl="https://cdn.example/frame.png" productName="Classic Frame" />)

    await userEvent.upload(screen.getByLabelText(/upload a photo/i), makePhotoFile())

    await waitFor(() => expect(URL.createObjectURL).toHaveBeenCalled())
  })

  it('lets the customer remove the uploaded photo and returns to the prompt', async () => {
    render(<TryOnPreview frameImageUrl="https://cdn.example/frame.png" productName="Classic Frame" />)

    await userEvent.upload(screen.getByLabelText(/upload a photo/i), makePhotoFile())
    await waitFor(() => expect(screen.getByAltText(/your photo/i)).toBeInTheDocument())

    await userEvent.click(screen.getByRole('button', { name: /remove photo/i }))

    expect(screen.queryByAltText(/your photo/i)).not.toBeInTheDocument()
    expect(screen.getByLabelText(/upload a photo/i)).toBeInTheDocument()
  })

  it('does not render at all when the product has no frame image to overlay', () => {
    const { container } = render(<TryOnPreview frameImageUrl={null} productName="Classic Frame" />)
    expect(container).toBeEmptyDOMElement()
  })
})
