import { describe, it, expect } from 'vitest'
import { createHmac } from 'crypto'
import { NextRequest } from 'next/server'
import { middleware } from './middleware'

function session(role: string): string {
  const data = Buffer.from(
    JSON.stringify({ customerId: 'a58630d6-35ef-4135-8f79-c39c2e99fa4b', role, iat: Date.now() })
  ).toString('base64url')
  const sig = createHmac('sha256', 'dev-secret-change-in-production').update(data).digest('hex')
  return `${data}.${sig}`
}

async function visit(path: string, role?: string) {
  const request = new NextRequest(`http://localhost${path}`)
  if (role) request.cookies.set('session', session(role))
  return middleware(request)
}

const OPS_CONSOLE = ['/admin/compliance', '/admin/orders', '/admin/support']
const CLINICAL = ['/admin/prescriptions', '/admin/partners']

// The ops role has existed in the schema since allow-ops-role.sql but could
// not open a single route: /admin was gated on ['optometrist', 'admin'].
describe('middleware — ops console gating', () => {
  it.each(OPS_CONSOLE)('lets ops through to %s', async (path) => {
    expect((await visit(path, 'ops')).status).toBe(200)
  })

  it.each(OPS_CONSOLE)('lets admin through to %s', async (path) => {
    expect((await visit(path, 'admin')).status).toBe(200)
  })

  it.each(OPS_CONSOLE)('sends an optometrist from %s to /unauthorized', async (path) => {
    const response = await visit(path, 'optometrist')
    expect(response.headers.get('location')).toContain('/unauthorized')
  })

  it.each(OPS_CONSOLE)('sends a customer from %s to /unauthorized', async (path) => {
    expect((await visit(path, 'customer')).headers.get('location')).toContain('/unauthorized')
  })

  it.each(OPS_CONSOLE)('sends an anonymous visitor from %s to /login', async (path) => {
    expect((await visit(path)).headers.get('location')).toContain('/login')
  })
})

// Applying the ops rule to all of /admin would lock optometrists out of the
// prescription review queue, which is their actual job.
describe('middleware — clinical queues keep their own gate', () => {
  it.each(CLINICAL)('still lets an optometrist into %s', async (path) => {
    expect((await visit(path, 'optometrist')).status).toBe(200)
  })

  it.each(CLINICAL)('does not let ops into %s', async (path) => {
    expect((await visit(path, 'ops')).headers.get('location')).toContain('/unauthorized')
  })

  it('still lets an optometrist into a nested prescription route', async () => {
    const path = '/admin/prescriptions/00000000-0000-4000-8000-000000000000/access-log'
    expect((await visit(path, 'optometrist')).status).toBe(200)
  })
})
