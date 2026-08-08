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

// Pre-hydration safety. Submission runs through onSubmit + preventDefault,
// which does not exist until React hydrates. In that window the browser
// performs the form's native submit, and a GET form serialises every field
// into the query string -- putting the credential in browser history, the
// Referer header of the next navigation, and every proxy and server access
// log. method=post is what makes that structurally impossible, independent
// of whether any JavaScript has run.
describe('partner registration form — pre-hydration submit safety', () => {
  it('declares method=post so a native submit cannot put credentials in the URL', () => {
    const { container } = render(<PartnerOnboardingPage />)

    const form = container.querySelector('form')
    expect(form).not.toBeNull()
    expect(form).toHaveAttribute('method', 'post')
  })
})

// The mockup's onboarding carried a partner-agreement e-sign, bank account
// number and IFSC, and a council registration number. None has a column:
// optometrist_partners holds clinic_name, kyc_status, kyc_document_key and
// referral_code, and nothing else.
describe('PartnerOnboardingPage — ships no unbacked onboarding steps', () => {
  it('asks for no bank account or IFSC', () => {
    const { container } = render(<PartnerOnboardingPage />)
    const text = container.textContent ?? ''

    expect(text).not.toMatch(/bank account|ifsc|account number/i)
    expect(screen.queryByLabelText(/bank|ifsc/i)).not.toBeInTheDocument()
  })

  it('asks for no e-signature or partner agreement acceptance', () => {
    const { container } = render(<PartnerOnboardingPage />)

    expect(container.textContent ?? '').not.toMatch(/e-sign|partner agreement|i have read and agree/i)
    expect(screen.queryByRole('checkbox', { name: /agree|agreement/i })).not.toBeInTheDocument()
  })

  it('asks for no council registration or licence number', () => {
    const { container } = render(<PartnerOnboardingPage />)

    expect(container.textContent ?? '').not.toMatch(/council reg|licence no|license no|registration no/i)
  })

  // The commission rate has no rule behind it — C4's ledger documents the same
  // gap from the other side — so onboarding must not promise a number.
  it('promises no commission rate', () => {
    const { container } = render(<PartnerOnboardingPage />)

    expect(container.textContent ?? '').not.toMatch(/\d+%\s*(commission|of referred)/i)
  })

  it('still asks for the things that do have columns', () => {
    render(<PartnerOnboardingPage />)

    expect(screen.getByLabelText(/clinic name/i)).toBeInTheDocument()
    expect(screen.getByLabelText(/kyc|document|upload/i)).toBeInTheDocument()
  })
})
