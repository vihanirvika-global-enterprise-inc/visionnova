import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, it, expect, vi, beforeEach } from 'vitest'
import PartnerOnboardingPage from './page'

vi.mock('./actions', () => ({
  partnerOnboardingAction: vi.fn(),
}))

import { partnerOnboardingAction } from './actions'

beforeEach(() => {
  vi.clearAllMocks()
})

function makeKycFile(): File {
  return new File(['fake-kyc-bytes'], 'license.pdf', { type: 'application/pdf' })
}

async function fillAndSubmit() {
  await userEvent.type(screen.getByLabelText(/your first name/i), 'Priya')
  await userEvent.type(screen.getByLabelText(/your last name/i), 'Sharma')
  await userEvent.type(screen.getByLabelText(/email/i), 'clinic@example.com')
  await userEvent.type(screen.getByLabelText('Password'), 'a-long-enough-password')
  await userEvent.type(screen.getByLabelText(/clinic name/i), 'Sharma Eye Care')
  await userEvent.upload(screen.getByLabelText(/kyc document/i), makeKycFile())
  await userEvent.click(screen.getByRole('button', { name: /submit for review/i }))
}

describe('PartnerOnboardingPage', () => {
  it('renders every required field, including clinic name and KYC upload', () => {
    render(<PartnerOnboardingPage />)
    expect(screen.getByLabelText(/your first name/i)).toBeInTheDocument()
    expect(screen.getByLabelText(/your last name/i)).toBeInTheDocument()
    expect(screen.getByLabelText(/email/i)).toBeInTheDocument()
    expect(screen.getByLabelText('Password')).toBeInTheDocument()
    expect(screen.getByLabelText(/clinic name/i)).toBeInTheDocument()
    expect(screen.getByLabelText(/kyc document/i)).toBeInTheDocument()
  })

  // jsdom does not reliably carry a file input's selected file through a
  // simulated `new FormData(formElement)` submission — that gap is tested
  // directly in actions.test.ts with a real File constructed by hand. This
  // only proves the field accepts a selection and the other fields reach
  // the action correctly.
  it('lets the customer select a KYC file and submits the other fields to the action', async () => {
    vi.mocked(partnerOnboardingAction).mockResolvedValue(undefined as any)

    render(<PartnerOnboardingPage />)
    await userEvent.upload(screen.getByLabelText(/kyc document/i), makeKycFile())
    expect((screen.getByLabelText(/kyc document/i) as HTMLInputElement).files?.[0]?.name).toBe('license.pdf')

    await fillAndSubmit()

    await waitFor(() => expect(partnerOnboardingAction).toHaveBeenCalled())
    const formData = vi.mocked(partnerOnboardingAction).mock.calls[0][0]
    expect(formData.get('clinicName')).toBe('Sharma Eye Care')
    expect(formData.get('email')).toBe('clinic@example.com')
  })

  it('displays a field error returned by the action', async () => {
    vi.mocked(partnerOnboardingAction).mockResolvedValue({
      fieldErrors: { clinicName: ['Clinic name is required'] },
    })

    render(<PartnerOnboardingPage />)
    await fillAndSubmit()

    await waitFor(() => {
      expect(screen.getByRole('alert')).toHaveTextContent('Clinic name is required')
    })
  })

  it('links to the existing sign-in page for already-onboarded partners', () => {
    render(<PartnerOnboardingPage />)
    expect(screen.getByRole('link', { name: /sign in/i })).toHaveAttribute('href', '/login')
  })
})
