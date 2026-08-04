import { randomUUID, randomBytes, createHash, createCipheriv, createDecipheriv } from 'crypto'
import { mkdir, writeFile, readFile } from 'fs/promises'
import { join, resolve, extname, basename } from 'path'
import { requiredSecret } from './requiredSecret'

// Deliberately NOT under public/ — Next.js serves everything there as an
// unauthenticated static asset. Files here are reachable only through
// /api/prescriptions/[id]/file, which checks the session first.
export const PRESCRIPTION_UPLOAD_DIR = join(process.cwd(), 'uploads', 'prescriptions')

const ALLOWED_EXTENSIONS = new Set(['.pdf', '.png', '.jpg', '.jpeg', '.webp'])
const IV_LENGTH = 12
const AUTH_TAG_LENGTH = 16

export const CONTENT_TYPES: Record<string, string> = {
  '.pdf': 'application/pdf',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.webp': 'image/webp',
}

// EP-010 BUG-007 (Risk TECH-04 — production data encryption at rest). This
// closes a gap kycStorage.ts previously flagged explicitly in its own
// comments: CLAUDE.md claims all medical/Rx data is encrypted at rest, but
// this file wrote plaintext until now. Same AES-256-GCM scheme as
// kycStorage.ts's getEncryptionKey, deliberately duplicated rather than
// shared — the two document types use different keys so a compromise of one
// doesn't expose the other, and each module stays independently readable.
//
// No migration path is included for files saved before this change: this is
// a pre-launch MVP (see CLAUDE.md sprint plan) with no real customer data in
// any deployed environment yet. A real deployment that already has uploaded
// prescriptions on disk needs a one-time re-encryption pass before this
// ships — that is a deployment/ops step, not something to fabricate here.
function getEncryptionKey(): Buffer {
  const secret = requiredSecret('PRESCRIPTION_ENCRYPTION_KEY')
  return createHash('sha256').update(secret).digest()
}

// A random key, not the user's filename: the old scheme was
// `${Date.now()}-${file.name}`, which is guessable and leaks the original name.
export function buildStorageKey(originalName: string): string {
  const extension = extname(basename(originalName)).toLowerCase()
  return ALLOWED_EXTENSIONS.has(extension)
    ? `${randomUUID()}${extension}`
    : randomUUID()
}

export function contentTypeForKey(key: string): string {
  return CONTENT_TYPES[extname(key).toLowerCase()] ?? 'application/octet-stream'
}

// Keys come from the database, so a corrupted or legacy row must not be able to
// read arbitrary files off disk.
export function resolvePrescriptionPath(key: string): string {
  // Reject backslashes outright rather than relying on path.resolve to catch
  // them: Node's path module only treats '\' as a separator on Windows, so a
  // key like '..\secret.env' is a real traversal attempt there but is just a
  // literal (harmless-looking) filename on POSIX — where this app actually
  // runs in production and in CI. A legitimate key (a UUID + extension, or
  // the legacy /uploads/ prefix) never contains one.
  if (key.includes('\\')) {
    throw new Error(`Invalid prescription storage key: ${key}`)
  }

  const withoutLegacyPrefix = key.replace(/^\/?uploads\//, '')
  const resolved = resolve(PRESCRIPTION_UPLOAD_DIR, withoutLegacyPrefix)
  const root = resolve(PRESCRIPTION_UPLOAD_DIR)

  if (resolved !== join(root, basename(resolved)) || !resolved.startsWith(root)) {
    throw new Error(`Invalid prescription storage key: ${key}`)
  }

  return resolved
}

// Stored layout: [12-byte IV][16-byte auth tag][ciphertext]. AES-256-GCM,
// not CBC: GCM's auth tag makes a tampered file fail to decrypt rather than
// silently returning corrupted plaintext.
export async function savePrescriptionFile(
  bytes: Buffer,
  originalName: string
): Promise<string> {
  const key = buildStorageKey(originalName)
  const iv = randomBytes(IV_LENGTH)
  const cipher = createCipheriv('aes-256-gcm', getEncryptionKey(), iv)
  const ciphertext = Buffer.concat([cipher.update(bytes), cipher.final()])
  const authTag = cipher.getAuthTag()

  await mkdir(PRESCRIPTION_UPLOAD_DIR, { recursive: true })
  await writeFile(resolvePrescriptionPath(key), Buffer.concat([iv, authTag, ciphertext]))
  return key
}

export async function readPrescriptionFile(key: string): Promise<Buffer> {
  const stored = await readFile(resolvePrescriptionPath(key))
  const iv = stored.subarray(0, IV_LENGTH)
  const authTag = stored.subarray(IV_LENGTH, IV_LENGTH + AUTH_TAG_LENGTH)
  const ciphertext = stored.subarray(IV_LENGTH + AUTH_TAG_LENGTH)

  const decipher = createDecipheriv('aes-256-gcm', getEncryptionKey(), iv)
  decipher.setAuthTag(authTag)
  return Buffer.concat([decipher.update(ciphertext), decipher.final()])
}
