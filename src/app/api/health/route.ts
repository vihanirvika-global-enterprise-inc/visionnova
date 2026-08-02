import { NextResponse } from 'next/server'
import { sql } from '@/lib/db'

export const dynamic = 'force-dynamic'

const DB_CHECK_TIMEOUT_MS = 2000

async function isDatabaseHealthy(): Promise<boolean> {
  try {
    await Promise.race([
      sql`SELECT 1`,
      new Promise((_resolve, reject) =>
        setTimeout(() => reject(new Error('DB health check timed out')), DB_CHECK_TIMEOUT_MS)
      ),
    ])
    return true
  } catch {
    // Deliberately not logged with the raw error here: this endpoint is
    // unauthenticated by design (monitoring tools need to hit it without
    // credentials), so anything captured must stay out of the response body.
    // A real outage will already be visible through captureOrderError/etc.
    // on the code paths that actually touch the DB.
    return false
  }
}

export async function GET() {
  const healthy = await isDatabaseHealthy()

  if (!healthy) {
    return NextResponse.json({ status: 'unhealthy' }, { status: 503 })
  }

  return NextResponse.json({ status: 'ok' }, { status: 200 })
}
