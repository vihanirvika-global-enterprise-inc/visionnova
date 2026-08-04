import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, it, expect, vi, beforeEach } from 'vitest'
import PrescriptionUploadPage from './page'

vi.mock('./actions', () => ({ uploadPrescriptionAction: vi.fn() }))
import { uploadPrescriptionAction } from './actions'

describe('PrescriptionUploadPage', () => {
  beforeEach(() => vi.clearAllMocks())

  it('renders a file input for prescription upload', () => {
    render(<PrescriptionUploadPage />)
    expect(screen.getByLabelText(/upload prescription/i)).toBeInTheDocument()
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

  it('links to eye test booking for customers without a current prescription', () => {
    render(<PrescriptionUploadPage />)
    expect(screen.getByRole('link', { name: /book an eye test/i })).toHaveAttribute(
      'href', '/eye-test'
    )
  })

  it('renders a consent checkbox, unchecked by default', () => {
    render(<PrescriptionUploadPage />)
    expect(screen.getByRole('checkbox', { name: /consent/i })).not.toBeChecked()
  })

  it('submits the consent field as part of the form data', async () => {
    vi.mocked(uploadPrescriptionAction).mockResolvedValue(undefined as any)

    render(<PrescriptionUploadPage />)
    await userEvent.click(screen.getByRole('checkbox', { name: /consent/i }))
    await userEvent.click(screen.getByRole('button', { name: /upload/i }))

    await waitFor(() => expect(uploadPrescriptionAction).toHaveBeenCalled())
    const formData = vi.mocked(uploadPrescriptionAction).mock.calls[0][0]
    expect(formData.get('consent')).toBe('on')
  })
})
