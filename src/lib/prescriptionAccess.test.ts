import { describe, it, expect, vi, beforeEach } from 'vitest'

vi.mock('./prescriptions', () => ({ getPrescriptionById: vi.fn() }))
vi.mock('./prescriptionStorage', () => ({ readPrescriptionFile: vi.fn() }))
vi.mock('./prescriptionAccessLogs', () => ({ logPrescriptionAccess: vi.fn() }))

import { getPrescriptionById } from './prescriptions'
import { readPrescriptionFile } from './prescriptionStorage'
import { logPrescriptionAccess } from './prescriptionAccessLogs'
import { readPrescriptionForSession } from './prescriptionAccess'

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
    })
  })

  it.each(['optometrist', 'admin'])('logs a %s reading someone else\'s prescription', async (role) => {
    const result = await readPrescriptionForSession(RX, { customerId: 'cust-reviewer', role })

    expect(result.ok).toBe(true)
    expect(logPrescriptionAccess).toHaveBeenCalledWith({
      prescriptionId: RX,
      accessorId: 'cust-reviewer',
      accessorRole: role,
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
