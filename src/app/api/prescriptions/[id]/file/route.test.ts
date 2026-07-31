import { describe, it, expect, vi, beforeEach } from 'vitest'
import { NextRequest } from 'next/server'

vi.mock('@/lib/session', () => ({ getSession: vi.fn() }))
vi.mock('@/lib/prescriptions', () => ({ getPrescriptionById: vi.fn() }))
vi.mock('@/lib/prescriptionStorage', () => ({
  readPrescriptionFile: vi.fn(),
  contentTypeForKey: (key: string) =>
    key.endsWith('.png') ? 'image/png' : 'application/pdf',
}))

import { getSession } from '@/lib/session'
import { getPrescriptionById } from '@/lib/prescriptions'
import { readPrescriptionFile } from '@/lib/prescriptionStorage'
import { GET } from './route'

const OWNER = 'cust-owner'
const PRESCRIPTION_ID = 'rx-1'

function request() {
  return new NextRequest(`http://localhost/api/prescriptions/${PRESCRIPTION_ID}/file`)
}

function params() {
  return { params: { id: PRESCRIPTION_ID } }
}

function givenPrescription(fileUrl = 'stored-key.pdf') {
  vi.mocked(getPrescriptionById).mockResolvedValue({
    id: PRESCRIPTION_ID,
    customerId: OWNER,
    fileUrl,
  } as any)
}

beforeEach(() => {
  vi.clearAllMocks()
  vi.mocked(readPrescriptionFile).mockResolvedValue(Buffer.from('%PDF-1.4 rx'))
})

describe('GET /api/prescriptions/[id]/file — rejects', () => {
  it('401s an unauthenticated request', async () => {
    vi.mocked(getSession).mockReturnValue(null)
    givenPrescription()

    const response = await GET(request(), params())

    expect(response.status).toBe(401)
    expect(readPrescriptionFile).not.toHaveBeenCalled()
  })

  // Health data: another signed-in customer must not be able to read it.
  it('403s a signed-in customer who does not own the prescription', async () => {
    vi.mocked(getSession).mockReturnValue({ customerId: 'cust-other', role: 'customer' })
    givenPrescription()

    const response = await GET(request(), params())

    expect(response.status).toBe(403)
    expect(readPrescriptionFile).not.toHaveBeenCalled()
  })

  it('404s an unknown prescription', async () => {
    vi.mocked(getSession).mockReturnValue({ customerId: OWNER, role: 'customer' })
    vi.mocked(getPrescriptionById).mockResolvedValue(null)

    const response = await GET(request(), params())

    expect(response.status).toBe(404)
    expect(readPrescriptionFile).not.toHaveBeenCalled()
  })

  it('404s rather than 500 when the stored key is unreadable', async () => {
    vi.mocked(getSession).mockReturnValue({ customerId: OWNER, role: 'customer' })
    givenPrescription()
    vi.mocked(readPrescriptionFile).mockRejectedValue(new Error('ENOENT'))

    const response = await GET(request(), params())

    expect(response.status).toBe(404)
  })
})

describe('GET /api/prescriptions/[id]/file — allows', () => {
  it('serves the file to its owner', async () => {
    vi.mocked(getSession).mockReturnValue({ customerId: OWNER, role: 'customer' })
    givenPrescription()

    const response = await GET(request(), params())

    expect(response.status).toBe(200)
    expect(readPrescriptionFile).toHaveBeenCalledWith('stored-key.pdf')
    expect(await response.text()).toContain('%PDF-1.4')
  })

  it.each(['optometrist', 'admin'])('serves the file to a %s reviewer', async (role) => {
    vi.mocked(getSession).mockReturnValue({ customerId: 'cust-reviewer', role })
    givenPrescription()

    const response = await GET(request(), params())

    expect(response.status).toBe(200)
  })

  it('sets the content type from the stored extension', async () => {
    vi.mocked(getSession).mockReturnValue({ customerId: OWNER, role: 'customer' })
    givenPrescription('stored-key.png')

    const response = await GET(request(), params())

    expect(response.headers.get('content-type')).toBe('image/png')
  })

  // Health data must not sit in a shared or browser cache.
  it('marks the response private and non-cacheable', async () => {
    vi.mocked(getSession).mockReturnValue({ customerId: OWNER, role: 'customer' })
    givenPrescription()

    const response = await GET(request(), params())

    expect(response.headers.get('cache-control')).toMatch(/no-store/)
    expect(response.headers.get('x-content-type-options')).toBe('nosniff')
  })
})
