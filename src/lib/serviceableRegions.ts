import type { Region } from '@/types'

// Product prices are stored as plain INR numbers and there is no FX layer, so
// charging a GLOBAL customer would bill the rupee figure in their currency —
// a ~83x overcharge on a USD card. India-first: GLOBAL stays closed until
// multi-currency pricing exists.
//
// regionForCountry and currencyForRegion are deliberately left intact; only
// this gate needs to change when real multi-currency lands.
export function isServiceableRegion(region: Region): boolean {
  return region === 'IN'
}

export const UNSERVICEABLE_REGION_MESSAGE =
  'We do not ship there yet — VisionNova currently delivers within India only.'
