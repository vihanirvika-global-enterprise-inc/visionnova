import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import * as NextHeaders from 'next/headers'
import * as NextNavigation from 'next/navigation'
import * as Prescriptions from '@/lib/prescriptions'
import * as Session from '@/lib/session'
import * as Storage from '@/lib/prescriptionStorage'
import { uploadPrescriptionAction } from './actions'

vi.mock('@/lib/prescriptions', () => ({ createPrescription: vi.fn() }))
vi.mock('next/navigation', () => ({ redirect: vi.fn() }))
vi.mock('@/lib/session', () => ({ getSession: vi.fn() }))
vi.mock('@/lib/prescriptionStorage', () => ({
  savePrescriptionFile: vi.fn().mockResolvedValue('generated-key.pdf'),
}))

let mockSet: ReturnType<typeof vi.fn>
let mockGet: ReturnType<typeof vi.fn>
let mockDelete: ReturnType<typeof vi.fn>

beforeEach(() => {
  vi.clearAllMocks()
  mockSet = vi.fn()
  mockGet = vi.fn()
  mockDelete = vi.fn()
  vi.spyOn(NextHeaders, 'cookies').mockReturnValue(
    { set: mockSet, get: mockGet, delete: mockDelete } as any
  )
  vi.mocked(Session.getSession).mockReturnValue({ customerId: 'cust-1', role: 'customer' })
  vi.mocked(Storage.savePrescriptionFile).mockResolvedValue('generated-key.pdf')
})

afterEach(() => { vi.restoreAllMocks() })

function makeFormDataWithFile(filename: string, type: string, { withConsent = true } = {}): FormData {
  const fd = new FormData()
  const blob = new Blob(['fake-content'], { type })
  fd.append('prescription', new File([blob], filename, { type }))
  if (withConsent) fd.append('consent', 'on')
  return fd
}

describe('uploadPrescriptionAction', () => {
  it('returns an error when no file is provided', async () => {
    const result = await uploadPrescriptionAction(new FormData())

    expect(result).toEqual({ error: expect.any(String) })
    expect(Prescriptions.createPrescription).not.toHaveBeenCalled()
  })

  it('returns an error when there is no session', async () => {
    vi.mocked(Session.getSession).mockReturnValue(null)

    const result = await uploadPrescriptionAction(
      makeFormDataWithFile('rx.pdf', 'application/pdf')
    )

    expect(result).toEqual({ error: expect.any(String) })
    expect(Prescriptions.createPrescription).not.toHaveBeenCalled()
  })

  it('saves file and creates prescription record on success', async () => {
    vi.mocked(Storage.savePrescriptionFile).mockResolvedValue('generated-key.pdf')
    vi.mocked(Prescriptions.createPrescription).mockResolvedValue({} as any)

    await uploadPrescriptionAction(makeFormDataWithFile('rx.pdf', 'application/pdf'))

    expect(Storage.savePrescriptionFile).toHaveBeenCalled()
    expect(Prescriptions.createPrescription).toHaveBeenCalledWith(
      expect.objectContaining({ customerId: 'cust-1', fileUrl: 'generated-key.pdf' })
    )
    expect(NextNavigation.redirect).toHaveBeenCalledWith('/account')
  })

  // ST-007: consent gates the upload itself — an unchecked box must not
  // result in a prescription record (which would mean review happened
  // without consent ever having been given).
  it('returns an error and never creates a record when consent is not given', async () => {
    const result = await uploadPrescriptionAction(
      makeFormDataWithFile('rx.pdf', 'application/pdf', { withConsent: false })
    )

    expect(result).toEqual({ error: expect.any(String) })
    expect(Storage.savePrescriptionFile).not.toHaveBeenCalled()
    expect(Prescriptions.createPrescription).not.toHaveBeenCalled()
  })

  it('passes the consent timestamp through to createPrescription', async () => {
    vi.mocked(Storage.savePrescriptionFile).mockResolvedValue('generated-key.pdf')
    vi.mocked(Prescriptions.createPrescription).mockResolvedValue({} as any)

    await uploadPrescriptionAction(makeFormDataWithFile('rx.pdf', 'application/pdf'))

    const { consentGivenAt } = vi.mocked(Prescriptions.createPrescription).mock.calls[0][0]
    expect(consentGivenAt).toBeInstanceOf(Date)
  })

  // A public path is exactly what this step removes; storing one again would
  // reintroduce the unauthenticated route.
  it('stores an opaque key, never a public /uploads/ path', async () => {
    vi.mocked(Storage.savePrescriptionFile).mockResolvedValue('generated-key.pdf')
    vi.mocked(Prescriptions.createPrescription).mockResolvedValue({} as any)

    await uploadPrescriptionAction(makeFormDataWithFile('rx.pdf', 'application/pdf'))

    const { fileUrl } = vi.mocked(Prescriptions.createPrescription).mock.calls[0][0]
    expect(fileUrl).not.toMatch(/^\/uploads\//)
    expect(fileUrl).not.toContain('/')
  })
})
