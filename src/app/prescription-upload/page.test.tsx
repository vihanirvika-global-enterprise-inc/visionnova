import { render, screen } from '@testing-library/react'
import { describe, it, expect } from 'vitest'
import PrescriptionUploadPage from './page'

describe('PrescriptionUploadPage', () => {
  it('renders a file input for prescription upload', () => {
    render(<PrescriptionUploadPage />)
    expect(screen.getByLabelText(/prescription/i)).toBeInTheDocument()
  })

  it('renders an upload submit button', () => {
    render(<PrescriptionUploadPage />)
    expect(screen.getByRole('button', { name: /upload/i })).toBeInTheDocument()
  })
})
