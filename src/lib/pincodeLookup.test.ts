import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { lookupPincode } from './pincodeLookup'

// The live India Post API is never called from tests — every case here drives
// a stubbed fetch. A test that reached the real service would be slow, flaky,
// and dependent on someone else's uptime to report a pass.
function stubFetch(payload: unknown, ok = true) {
  const fetchMock = vi.fn().mockResolvedValue({
    ok,
    json: async () => payload,
  })
  vi.stubGlobal('fetch', fetchMock)
  return fetchMock
}

// Shape of a real api.postalpincode.in response, trimmed to the fields used.
function postOffice(name: string, district: string, state: string) {
  return { Name: name, District: district, State: state }
}

function successPayload(offices: ReturnType<typeof postOffice>[]) {
  return [{ Message: 'Number of pincode(s) found:1', Status: 'Success', PostOffice: offices }]
}

beforeEach(() => vi.clearAllMocks())
afterEach(() => vi.unstubAllGlobals())

describe('lookupPincode', () => {
  it('returns the district and canonical state for a known PIN', async () => {
    stubFetch(successPayload([postOffice('Patamata', 'Krishna', 'Andhra Pradesh')]))

    const result = await lookupPincode('520010')

    expect(result).toEqual({
      status: 'found',
      districts: ['Krishna'],
      state: 'Andhra Pradesh',
    })
  })

  it('requests the PIN that was asked for', async () => {
    const fetchMock = stubFetch(successPayload([postOffice('Patamata', 'Krishna', 'Andhra Pradesh')]))

    await lookupPincode('520010')

    expect(fetchMock.mock.calls[0][0]).toContain('520010')
  })

  // A PIN routinely covers many post offices. Collapsing them to one district
  // is the common case and must not surface as a choice.
  it('collapses repeated districts to a single option', async () => {
    stubFetch(successPayload([
      postOffice('Patamata', 'Krishna', 'Andhra Pradesh'),
      postOffice('Benz Circle', 'Krishna', 'Andhra Pradesh'),
      postOffice('Auto Nagar', 'Krishna', 'Andhra Pradesh'),
    ]))

    const result = await lookupPincode('520010')

    expect(result).toEqual({ status: 'found', districts: ['Krishna'], state: 'Andhra Pradesh' })
  })

  // When a PIN genuinely straddles districts, both are offered — guessing one
  // would put the wrong city on the parcel.
  it('returns every distinct district when a PIN spans more than one', async () => {
    stubFetch(successPayload([
      postOffice('Office A', 'Krishna', 'Andhra Pradesh'),
      postOffice('Office B', 'Guntur', 'Andhra Pradesh'),
      postOffice('Office C', 'Krishna', 'Andhra Pradesh'),
    ]))

    const result = await lookupPincode('520010')

    expect(result.status).toBe('found')
    expect(result.status === 'found' && result.districts).toEqual(['Guntur', 'Krishna'])
  })

  it('canonicalises the state name the API returns', async () => {
    stubFetch(successPayload([postOffice('Office', 'Krishna', 'ANDHRA  PRADESH')]))

    const result = await lookupPincode('520010')

    expect(result.status === 'found' && result.state).toBe('Andhra Pradesh')
  })

  it('reports a null state when the API returns one not on the canonical list', async () => {
    stubFetch(successPayload([postOffice('Office', 'Krishna', 'Freedonia')]))

    const result = await lookupPincode('520010')

    expect(result.status === 'found' && result.state).toBeNull()
  })

  it('reports not-found when the API says Error', async () => {
    stubFetch([{ Message: 'No records found', Status: 'Error', PostOffice: null }])

    expect(await lookupPincode('999999')).toEqual({ status: 'not-found' })
  })

  // Everything below must resolve, never throw: this runs as the customer
  // types, and an unhandled rejection there would take the form down over a
  // convenience feature.
  it('reports unavailable when the network call rejects', async () => {
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new Error('offline')))

    expect(await lookupPincode('520010')).toEqual({ status: 'unavailable' })
  })

  it('reports unavailable on a non-OK HTTP response', async () => {
    stubFetch([], false)

    expect(await lookupPincode('520010')).toEqual({ status: 'unavailable' })
  })

  it('reports unavailable when the response shape is not what we expect', async () => {
    stubFetch({ unexpected: 'shape' })

    expect(await lookupPincode('520010')).toEqual({ status: 'unavailable' })
  })

  it('reports unavailable when the body is not valid JSON', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({
      ok: true,
      json: async () => { throw new SyntaxError('Unexpected token') },
    }))

    expect(await lookupPincode('520010')).toEqual({ status: 'unavailable' })
  })

  // A hung request must not leave the field showing "looking up…" forever.
  it('bounds the request with an abort signal', async () => {
    const fetchMock = stubFetch(successPayload([postOffice('Office', 'Krishna', 'Andhra Pradesh')]))

    await lookupPincode('520010')

    expect(fetchMock.mock.calls[0][1]).toHaveProperty('signal')
  })

  it('does not call the network for a PIN that cannot be valid', async () => {
    const fetchMock = stubFetch(successPayload([]))

    expect(await lookupPincode('000000')).toEqual({ status: 'not-found' })
    expect(await lookupPincode('5200')).toEqual({ status: 'not-found' })
    expect(fetchMock).not.toHaveBeenCalled()
  })
})
