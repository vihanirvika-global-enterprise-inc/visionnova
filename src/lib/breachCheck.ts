import { createHash } from 'crypto'

const HIBP_RANGE_URL = 'https://api.pwnedpasswords.com/range/'

// k-anonymity: only the first 5 chars of the SHA-1 hash ever leave this
// process, so HIBP never sees the actual password or its full hash.
export async function checkBreached(password: string): Promise<boolean> {
  const sha1 = createHash('sha1').update(password).digest('hex').toUpperCase()
  const prefix = sha1.slice(0, 5)
  const suffix = sha1.slice(5)

  const response = await fetch(`${HIBP_RANGE_URL}${prefix}`)
  if (!response.ok) {
    throw new Error(`HIBP request failed with status ${response.status}`)
  }

  const body = await response.text()
  return body.split('\n').some((line) => line.split(':')[0] === suffix)
}
