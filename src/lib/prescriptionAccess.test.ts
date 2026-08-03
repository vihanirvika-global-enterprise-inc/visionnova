import { describe, it, expect, vi, beforeEach } from 'vitest'

vi.mock('./prescriptions', () => ({ getPrescriptionById: vi.fn() }))
vi.mock('./prescriptionStorage', () => ({ readPrescriptionFile: vi.fn() }))
vi.mock('./prescriptionAccessLogs', () => ({ logPrescriptionAccess: vi.fn() }))

import { getPrescriptionById } from './prescriptions'
import { readPrescriptionFile } from './prescriptionStorage'
import { logPrescriptionAccess } from './prescriptionAccessLogs'
import { readPrescriptionForSession, readPrescriptionMetadataForSession } from './prescriptionAccess'

const OWNER = 'cust-owner'
const RX = 'rx-1'

function givenPrescription() {
  vi.mocked(getPrescriptionById).mockResolvedValue({
    id: RX,
    customerId: OWNER,
    fileUrl: 'key.pdf',
  } as any)
}

beforeEach(() => {
  vi.clearAllMocks()
  vi.mocked(readPrescriptionFile).mockResolvedValue(Buffer.from('rx bytes'))
  vi.mocked(logPrescriptionAccess).mockResolvedValue(undefined)
  givenPrescription()
})

describe('readPrescriptionForSession — denies without logging a read', () => {
  // A refused attempt is not a read. Logging one as an access would corrupt the
  // audit trail's meaning.
  it.each([
    ['unauthenticated', null],
    ['forbidden', { customerId: 'someone-else', role: 'customer' }],
  ])('denies %s and never touches the file', async (reason, session) => {
    const result = await readPrescriptionForSession(RX, session as never)

    expect(result.ok).toBe(false)
    if (!result.ok) expect(result.reason).toBe(reason)
    expect(readPrescriptionFile).not.toHaveBeenCalled()
    expect(logPrescriptionAccess).not.toHaveBeenCalled()
  })

  it('denies an unknown prescription', async () => {
    vi.mocked(getPrescriptionById).mockResolvedValue(null)

    const result = await readPrescriptionForSession(RX, { customerId: OWNER, role: 'customer' })

    expect(result.ok).toBe(false)
    if (!result.ok) expect(result.reason).toBe('not_found')
    expect(logPrescriptionAccess).not.toHaveBeenCalled()
  })

  it('denies when the stored file is unreadable', async () => {
    vi.mocked(readPrescriptionFile).mockRejectedValue(new Error('ENOENT'))

    const result = await readPrescriptionForSession(RX, { customerId: OWNER, role: 'customer' })

    expect(result.ok).toBe(false)
    if (!result.ok) expect(result.reason).toBe('unreadable')
    expect(logPrescriptionAccess).not.toHaveBeenCalled()
  })
})

describe('readPrescriptionForSession — logs every successful read', () => {
  it('returns the bytes to the owner and logs the access', async () => {
    const result = await readPrescriptionForSession(RX, { customerId: OWNER, role: 'customer' })

    expect(result.ok).toBe(true)
    if (result.ok) expect(result.file.toString()).toBe('rx bytes')
    expect(logPrescriptionAccess).toHaveBeenCalledWith({
      prescriptionId: RX,
      accessorId: OWNER,
      accessorRole: 'customer',
      accessType: 'file',
    })
  })

  it.each(['optometrist', 'admin'])('logs a %s reading someone else\'s prescription', async (role) => {
    const result = await readPrescriptionForSession(RX, { customerId: 'cust-reviewer', role })

    expect(result.ok).toBe(true)
    expect(logPrescriptionAccess).toHaveBeenCalledWith({
      prescriptionId: RX,
      accessorId: 'cust-reviewer',
      accessorRole: role,
      accessType: 'file',
    })
  })

  it('logs before handing the bytes back', async () => {
    await readPrescriptionForSession(RX, { customerId: OWNER, role: 'customer' })

    expect(vi.mocked(readPrescriptionFile).mock.invocationCallOrder[0]).toBeLessThan(
      vi.mocked(logPrescriptionAccess).mock.invocationCallOrder[0]
    )
  })

  // "Every access is logged" is a compliance requirement, so an unwritable
  // audit trail must block the read rather than produce an unlogged one.
  it('fails closed when the audit write fails', async () => {
    vi.mocked(logPrescriptionAccess).mockRejectedValue(new Error('db down'))

    const result = await readPrescriptionForSession(RX, { customerId: OWNER, role: 'customer' })

    expect(result.ok).toBe(false)
    if (!result.ok) expect(result.reason).toBe('audit_failed')
  })
})

// Opening the review screen shows the patient's name, email and submission
// date. That is a read of health data even though no file is fetched, so it
// belongs on the same trail — recorded as 'metadata' so an auditor can tell
// the two apart.
describe('readPrescriptionMetadataForSession', () => {
  it('returns the prescription to a reviewer and logs a metadata read', async () => {
    const result = await readPrescriptionMetadataForSession(RX, {
      customerId: 'cust-reviewer', role: 'optometrist',
    })

    expect(result.ok).toBe(true)
    expect(logPrescriptionAccess).toHaveBeenCalledWith({
      prescriptionId: RX,
      accessorId: 'cust-reviewer',
      accessorRole: 'optometrist',
      accessType: 'metadata',
    })
  })

  it('never reads the file bytes for a metadata read', async () => {
    await readPrescriptionMetadataForSession(RX, { customerId: OWNER, role: 'customer' })

    expect(readPrescriptionFile).not.toHaveBeenCalled()
  })

  it.each([
    ['unauthenticated', null],
    ['forbidden', { customerId: 'someone-else', role: 'customer' }],
  ])('denies %s without logging', async (reason, session) => {
    const result = await readPrescriptionMetadataForSession(RX, session as never)

    expect(result.ok).toBe(false)
    if (!result.ok) expect(result.reason).toBe(reason)
    expect(logPrescriptionAccess).not.toHaveBeenCalled()
  })

  it('denies an unknown prescription', async () => {
    vi.mocked(getPrescriptionById).mockResolvedValue(null)

    const result = await readPrescriptionMetadataForSession(RX, {
      customerId: 'cust-reviewer', role: 'optometrist',
    })

    expect(result.ok).toBe(false)
    if (!result.ok) expect(result.reason).toBe('not_found')
    expect(logPrescriptionAccess).not.toHaveBeenCalled()
  })

  // Same compliance bar as the file read: no unlogged look at health data.
  it('fails closed when the audit write fails', async () => {
    vi.mocked(logPrescriptionAccess).mockRejectedValue(new Error('db down'))

    const result = await readPrescriptionMetadataForSession(RX, {
      customerId: 'cust-reviewer', role: 'optometrist',
    })

    expect(result.ok).toBe(false)
    if (!result.ok) expect(result.reason).toBe('audit_failed')
  })
})
