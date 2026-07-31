import type { Region } from '@/types'
import { COUNTRIES, type Country } from './countries'
import { regionForCountry } from './region'

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

// Derived from the guard rather than hand-listed, so the checkout select can
// never offer a country the guard would reject at the end of the form. Opening
// a new region means changing isServiceableRegion; this list follows.
//
// COUNTRIES itself stays complete — it is the ISO-3166 source of truth for
// validation, and shrinking it would break address validation for existing
// orders shipped before a region closed.
export const SERVICEABLE_COUNTRIES: readonly Country[] = COUNTRIES.filter((country) =>
  isServiceableRegion(regionForCountry(country.code))
)
