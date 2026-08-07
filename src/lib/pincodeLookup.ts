import { isValidPinCode, canonicaliseIndianState, type IndianState } from './indiaAddress'

// India Post's public PIN directory. Called from the browser as a typing-time
// convenience — never from a server action, and never on the path that
// actually creates an order. A customer whose network blocks this endpoint
// must still be able to complete checkout by typing City and State.
const INDIA_POST_URL = 'https://api.postalpincode.in/pincode/'

// Long enough for a slow mobile connection, short enough that a hung request
// does not leave the field stuck on "looking up…" indefinitely.
const REQUEST_TIMEOUT_MS = 5000

export type PincodeLookupResult =
  | { status: 'found'; districts: string[]; state: IndianState | null }
  // The PIN is well-formed but India Post has no record of it.
  | { status: 'not-found' }
  // We could not find out — offline, blocked, timed out, or the response was
  // not what this code knows how to read. Deliberately distinct from
  // 'not-found': the caller must not tell the customer their PIN is wrong
  // when the truth is that we failed to ask.
  | { status: 'unavailable' }

interface PostOffice {
  District?: unknown
  State?: unknown
}

function isPostOfficeList(value: unknown): value is PostOffice[] {
  return Array.isArray(value) && value.every((entry) => typeof entry === 'object' && entry !== null)
}

export async function lookupPincode(pinCode: string): Promise<PincodeLookupResult> {
  // No point spending a request on input that cannot match anything.
  if (!isValidPinCode(pinCode)) return { status: 'not-found' }

  let payload: unknown
  try {
    const response = await fetch(`${INDIA_POST_URL}${pinCode.trim()}`, {
      signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
    })
    if (!response.ok) return { status: 'unavailable' }
    payload = await response.json()
  } catch {
    // Every failure mode collapses here on purpose: this resolves rather than
    // throws, because it runs as the customer types and an unhandled
    // rejection would take the form down over a convenience feature.
    return { status: 'unavailable' }
  }

  // The API answers with a single-element array. Anything else means the
  // response is not what this code knows how to read — report that honestly
  // rather than guessing at it.
  if (!Array.isArray(payload) || payload.length === 0) return { status: 'unavailable' }

  const [entry] = payload as Array<{ Status?: unknown; PostOffice?: unknown }>
  if (entry?.Status === 'Error') return { status: 'not-found' }
  if (entry?.Status !== 'Success' || !isPostOfficeList(entry.PostOffice)) {
    return { status: 'unavailable' }
  }

  const districts = Array.from(
    new Set(
      entry.PostOffice
        .map((office) => (typeof office.District === 'string' ? office.District.trim() : ''))
        .filter(Boolean)
    )
  ).sort()

  if (districts.length === 0) return { status: 'not-found' }

  // Every post office under one PIN sits in the same state, so the first is
  // representative. It still goes through canonicalisation: the value has to
  // match a dropdown option exactly to be selectable, and null is the honest
  // answer when it does not.
  const rawState = entry.PostOffice.find((office) => typeof office.State === 'string')?.State
  const state = typeof rawState === 'string' ? canonicaliseIndianState(rawState) : null

  return { status: 'found', districts, state }
}
