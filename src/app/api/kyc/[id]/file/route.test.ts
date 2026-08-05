import { describe, it, expect, vi, beforeEach } from 'vitest'
import { NextRequest } from 'next/server'

vi.mock('@/lib/session', () => ({ getSession: vi.fn() }))
vi.mock('@/lib/optometristPartners', () => ({ readKycDocumentForSession: vi.fn() }))
vi.mock('@/lib/prescriptionStorage', () => ({
  contentTypeForKey: (key: string) =>
    key.endsWith('.png') ? 'image/png' : 'application/pdf',
}))

import { getSession } from '@/lib/session'
import { readKycDocumentForSession } from '@/lib/optometristPartners'
import { GET } from './route'

const PARTNER_ID = 'partner-1'

function request() {
  return new NextRequest(`http://localhost/api/kyc/${PARTNER_ID}/file`)
}

function params() {
  return { params: { id: PARTNER_ID } }
}

function granted(kycDocumentKey = 'key.pdf') {
  vi.mocked(readKycDocumentForSession).mockResolvedValue({
    ok: true,
    partner: { id: PARTNER_ID, kycDocumentKey } as never,
    file: Buffer.from('%PDF-1.4 kyc'),
  })
}

beforeEach(() => {
  vi.clearAllMocks()
  vi.mocked(getSession).mockReturnValue({ customerId: 'admin-1', role: 'admin' })
})

describe('GET /api/kyc/[id]/file — status mapping', () => {
  it.each([
    ['unauthenticated', 401],
    ['forbidden', 403],
    ['not_found', 404],
    ['unreadable', 404],
  ])('maps %s to %i', async (reason, status) => {
    vi.mocked(readKycDocumentForSession).mockResolvedValue({ ok: false, reason } as never)

    const response = await GET(request(), params())

    expect(response.status).toBe(status)
  })
})

describe('GET /api/kyc/[id]/file — granted', () => {
  it('returns the bytes', async () => {
    granted()

    const response = await GET(request(), params())

    expect(response.status).toBe(200)
    expect(await response.text()).toContain('%PDF-1.4')
  })

  it('delegates to the access choke point with the session', async () => {
    granted()

    await GET(request(), params())

    expect(readKycDocumentForSession).toHaveBeenCalledWith(PARTNER_ID, {
      customerId: 'admin-1', role: 'admin',
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
