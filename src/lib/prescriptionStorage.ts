import { randomUUID } from 'crypto'
import { mkdir, writeFile, readFile } from 'fs/promises'
import { join, resolve, extname, basename } from 'path'

// Deliberately NOT under public/ — Next.js serves everything there as an
// unauthenticated static asset. Files here are reachable only through
// /api/prescriptions/[id]/file, which checks the session first.
export const PRESCRIPTION_UPLOAD_DIR = join(process.cwd(), 'uploads', 'prescriptions')

const ALLOWED_EXTENSIONS = new Set(['.pdf', '.png', '.jpg', '.jpeg', '.webp'])

export const CONTENT_TYPES: Record<string, string> = {
  '.pdf': 'application/pdf',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.webp': 'image/webp',
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

export async function savePrescriptionFile(
  bytes: Buffer,
  originalName: string
): Promise<string> {
  const key = buildStorageKey(originalName)
  await mkdir(PRESCRIPTION_UPLOAD_DIR, { recursive: true })
  await writeFile(resolvePrescriptionPath(key), bytes)
  return key
}

export async function readPrescriptionFile(key: string): Promise<Buffer> {
  return readFile(resolvePrescriptionPath(key))
}
