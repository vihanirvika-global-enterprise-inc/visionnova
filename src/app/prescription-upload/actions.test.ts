import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import * as NextHeaders from 'next/headers'
import * as NextNavigation from 'next/navigation'
import * as Prescriptions from '@/lib/prescriptions'
import * as Session from '@/lib/session'
import * as fs from 'fs/promises'
import { uploadPrescriptionAction } from './actions'

vi.mock('@/lib/prescriptions', () => ({ createPrescription: vi.fn() }))
vi.mock('next/navigation', () => ({ redirect: vi.fn() }))
vi.mock('@/lib/session', () => ({ getSession: vi.fn() }))
vi.mock('fs/promises', () => ({
  writeFile: vi.fn().mockResolvedValue(undefined),
}))

let mockSet: ReturnType<typeof vi.fn>
let mockGet: ReturnType<typeof vi.fn>
let mockDelete: ReturnType<typeof vi.fn>

beforeEach(() => {
  mockSet = vi.fn()
  mockGet = vi.fn()
  mockDelete = vi.fn()
  vi.spyOn(NextHeaders, 'cookies').mockReturnValue(
    { set: mockSet, get: mockGet, delete: mockDelete } as any
  )
  vi.mocked(Session.getSession).mockReturnValue({ customerId: 'cust-1' })
})

afterEach(() => { vi.restoreAllMocks() })

function makeFormDataWithFile(filename: string, type: string): FormData {
  const fd = new FormData()
  const blob = new Blob(['fake-content'], { type })
  fd.append('prescription', new File([blob], filename, { type }))
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
    vi.mocked(fs.writeFile).mockResolvedValue(undefined)
    vi.mocked(Prescriptions.createPrescription).mockResolvedValue({} as any)

    await uploadPrescriptionAction(makeFormDataWithFile('rx.pdf', 'application/pdf'))

    expect(fs.writeFile).toHaveBeenCalled()
    expect(Prescriptions.createPrescription).toHaveBeenCalledWith(
      expect.objectContaining({ customerId: 'cust-1', fileUrl: expect.any(String) })
    )
    expect(NextNavigation.redirect).toHaveBeenCalledWith('/account')
  })
})
