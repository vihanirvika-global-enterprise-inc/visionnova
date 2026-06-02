import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, it, expect, vi } from 'vitest'
import PrescriptionUploadPage from './page'

vi.mock('./actions', () => ({ uploadPrescriptionAction: vi.fn() }))
import { uploadPrescriptionAction } from './actions'

describe('PrescriptionUploadPage', () => {
  it('renders a file input for prescription upload', () => {
    render(<PrescriptionUploadPage />)
    expect(screen.getByLabelText(/prescription/i)).toBeInTheDocument()
  })

  it('renders an upload submit button', () => {
    render(<PrescriptionUploadPage />)
    expect(screen.getByRole('button', { name: /upload/i })).toBeInTheDocument()
  })

  it('displays an error message returned by the action', async () => {
    vi.mocked(uploadPrescriptionAction).mockResolvedValue({ error: 'Please select a file to upload' })

    render(<PrescriptionUploadPage />)
    await userEvent.click(screen.getByRole('button', { name: /upload/i }))

    await waitFor(() => {
      expect(screen.getByRole('alert')).toHaveTextContent('Please select a file to upload')
    })
  })
})
