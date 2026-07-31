import { describe, it, expect, vi, beforeEach } from 'vitest'
import { NextRequest } from 'next/server'

vi.mock('@/lib/session', () => ({ getSession: vi.fn() }))
vi.mock('@/lib/prescriptionAccess', () => ({ readPrescriptionForSession: vi.fn() }))
vi.mock('@/lib/prescriptionStorage', () => ({
  contentTypeForKey: (key: string) =>
    key.endsWith('.png') ? 'image/png' : 'application/pdf',
}))

import { getSession } from '@/lib/session'
import { readPrescriptionForSession } from '@/lib/prescriptionAccess'
import { GET } from './route'

const PRESCRIPTION_ID = 'rx-1'

function request() {
  return new NextRequest(`http://localhost/api/prescriptions/${PRESCRIPTION_ID}/file`)
}

function params() {
  return { params: { id: PRESCRIPTION_ID } }
}

function granted(fileUrl = 'key.pdf') {
  vi.mocked(readPrescriptionForSession).mockResolvedValue({
    ok: true,
    prescription: { id: PRESCRIPTION_ID, fileUrl } as never,
    file: Buffer.from('%PDF-1.4 rx'),
  })
}

beforeEach(() => {
  vi.clearAllMocks()
  vi.mocked(getSession).mockReturnValue({ customerId: 'cust-owner', role: 'customer' })
})

describe('GET /api/prescriptions/[id]/file — status mapping', () => {
  it.each([
    ['unauthenticated', 401],
    ['forbidden', 403],
    ['not_found', 404],
    ['unreadable', 404],
    ['audit_failed', 500],
  ])('maps %s to %i', async (reason, status) => {
    vi.mocked(readPrescriptionForSession).mockResolvedValue({ ok: false, reason } as never)

    const response = await GET(request(), params())

    expect(response.status).toBe(status)
  })
})

describe('GET /api/prescriptions/[id]/file — granted', () => {
  it('returns the bytes', async () => {
    granted()

    const response = await GET(request(), params())

    expect(response.status).toBe(200)
    expect(await response.text()).toContain('%PDF-1.4')
  })

  // Authorization and logging live in the accessor, so the route cannot serve
  // a file without going through them.
  it('delegates to the access choke point with the session', async () => {
    granted()

    await GET(request(), params())

    expect(readPrescriptionForSession).toHaveBeenCalledWith(PRESCRIPTION_ID, {
      customerId: 'cust-owner',
      role: 'customer',
    })
  })

  it('sets the content type from the stored key', async () => {
    granted('key.png')

    const response = await GET(request(), params())

    expect(response.headers.get('content-type')).toBe('image/png')
  })

  it('marks the response private and non-cacheable', async () => {
    granted()

    const response = await GET(request(), params())

    expect(response.headers.get('cache-control')).toMatch(/no-store/)
    expect(response.headers.get('x-content-type-options')).toBe('nosniff')
  })
})
