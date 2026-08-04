import { randomUUID, randomBytes, createHash, createCipheriv, createDecipheriv } from 'crypto'
import { mkdir, writeFile, readFile } from 'fs/promises'
import { join, resolve, extname, basename } from 'path'
import { requiredSecret } from './requiredSecret'

// ST-021 ("KYC documents encrypted at rest"). Same directory-safety shape as
// prescriptionStorage.ts, deliberately duplicated rather than shared — see
// that file's own comment on why: not under public/, reachable only through
// an authenticated route.
export const KYC_UPLOAD_DIR = join(process.cwd(), 'uploads', 'kyc')

const ALLOWED_EXTENSIONS = new Set(['.pdf', '.png', '.jpg', '.jpeg', '.webp'])
const IV_LENGTH = 12
const AUTH_TAG_LENGTH = 16

// src/lib/prescriptionStorage.ts (customer prescription files) now uses this
// same AES-256-GCM scheme with its own key — closed under EP-010 BUG-007,
// having been flagged here as a gap when this module was first built for
// ST-021's KYC-specific requirement.
function getEncryptionKey(): Buffer {
  const secret = requiredSecret('KYC_ENCRYPTION_KEY')
  // SHA-256 turns an arbitrary-length secret into exactly the 32 bytes
  // AES-256 requires, the same "hash a passphrase into a fixed-length key"
  // approach as SESSION_SECRET's HMAC usage elsewhere in this codebase.
  return createHash('sha256').update(secret).digest()
}

export function buildKycStorageKey(originalName: string): string {
  const extension = extname(basename(originalName)).toLowerCase()
  return ALLOWED_EXTENSIONS.has(extension)
    ? `${randomUUID()}${extension}`
    : randomUUID()
}

export function resolveKycPath(key: string): string {
  if (key.includes('\\')) {
    throw new Error(`Invalid KYC storage key: ${key}`)
  }

  const resolved = resolve(KYC_UPLOAD_DIR, key)
  const root = resolve(KYC_UPLOAD_DIR)

  if (resolved !== join(root, basename(resolved)) || !resolved.startsWith(root)) {
    throw new Error(`Invalid KYC storage key: ${key}`)
  }

  return resolved
}

// Stored layout: [12-byte IV][16-byte auth tag][ciphertext]. AES-256-GCM,
// not CBC: GCM's auth tag makes a tampered file fail to decrypt rather than
// silently returning corrupted plaintext.
export async function saveKycDocument(bytes: Buffer, originalName: string): Promise<string> {
  const key = buildKycStorageKey(originalName)
  const iv = randomBytes(IV_LENGTH)
  const cipher = createCipheriv('aes-256-gcm', getEncryptionKey(), iv)
  const ciphertext = Buffer.concat([cipher.update(bytes), cipher.final()])
  const authTag = cipher.getAuthTag()

  await mkdir(KYC_UPLOAD_DIR, { recursive: true })
  await writeFile(resolveKycPath(key), Buffer.concat([iv, authTag, ciphertext]))
  return key
}

export async function readKycDocument(key: string): Promise<Buffer> {
  const stored = await readFile(resolveKycPath(key))
  const iv = stored.subarray(0, IV_LENGTH)
  const authTag = stored.subarray(IV_LENGTH, IV_LENGTH + AUTH_TAG_LENGTH)
  const ciphertext = stored.subarray(IV_LENGTH + AUTH_TAG_LENGTH)

  const decipher = createDecipheriv('aes-256-gcm', getEncryptionKey(), iv)
  decipher.setAuthTag(authTag)
  return Buffer.concat([decipher.update(ciphertext), decipher.final()])
}
