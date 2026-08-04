import { sql } from './db'
import type { PartnerStore } from '@/types'

// ST-014 / TK-028 (A14. Store Locator — wire to backend). List view only, per
// scoping decision: no map provider is configured in this repo, so there is
// no "renders on a map" affordance — city search stands in for it.
function mapPartnerStore(row: Record<string, unknown>): PartnerStore {
  return {
    id: row.id as string,
    name: row.name as string,
    addressLine1: row.address_line1 as string,
    addressLine2: (row.address_line2 as string) ?? null,
    city: row.city as string,
    state: row.state as string,
    postalCode: row.postal_code as string,
    phone: (row.phone as string) ?? null,
    createdAt: row.created_at as Date,
  }
}

export async function getPartnerStores(city?: string): Promise<PartnerStore[]> {
  if (city) {
    const rows = await sql`
      SELECT * FROM partner_stores WHERE city ILIKE ${`%${city}%`}
      ORDER BY name ASC
    `
    return rows.map(mapPartnerStore)
  }

  const rows = await sql`SELECT * FROM partner_stores ORDER BY city ASC, name ASC`
  return rows.map(mapPartnerStore)
}
