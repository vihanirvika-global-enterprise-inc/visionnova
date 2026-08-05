import { describe, it, expect, afterEach } from 'vitest'
import { rm, readFile, writeFile } from 'fs/promises'
import { join } from 'path'
import {
  PRESCRIPTION_UPLOAD_DIR,
  buildStorageKey,
  savePrescriptionFile,
  resolvePrescriptionPath,
  readPrescriptionFile,
} from './prescriptionStorage'

const written: string[] = []

afterEach(async () => {
  for (const key of written.splice(0)) {
    await rm(join(PRESCRIPTION_UPLOAD_DIR, key), { force: true })
  }
})

describe('PRESCRIPTION_UPLOAD_DIR', () => {
  // The whole point of this step: anything under public/ is served as an
  // unauthenticated static asset.
  it('is outside the public directory', () => {
    expect(PRESCRIPTION_UPLOAD_DIR).not.toMatch(/[\\/]public[\\/]/)
  })
})

describe('buildStorageKey', () => {
  it('does not derive the name from user input or a timestamp', () => {
    const key = buildStorageKey('my-prescription.pdf')

    expect(key).not.toContain('my-prescription')
    expect(key).toMatch(/^[0-9a-f-]{36}\.pdf$/)
  })

  it('is unguessable — two uploads of the same filename differ', () => {
    expect(buildStorageKey('rx.pdf')).not.toBe(buildStorageKey('rx.pdf'))
  })

  it('strips directory traversal from the extension', () => {
    const key = buildStorageKey('evil.../../../etc/passwd')

    expect(key).not.toContain('..')
    expect(key).not.toContain('/')
    expect(key).not.toContain('\\')
  })

  it('drops an unrecognised extension rather than trusting it', () => {
    expect(buildStorageKey('payload.php')).toMatch(/^[0-9a-f-]{36}$/)
    expect(buildStorageKey('noextension')).toMatch(/^[0-9a-f-]{36}$/)
  })

  it('keeps the allowed image and pdf extensions', () => {
    for (const ext of ['pdf', 'png', 'jpg', 'jpeg', 'webp']) {
      expect(buildStorageKey(`rx.${ext}`)).toMatch(new RegExp(`\\.${ext}$`))
    }
  })
})

describe('resolvePrescriptionPath', () => {
  it('resolves a plain key inside the upload directory', () => {
    expect(resolvePrescriptionPath('abc.pdf')).toBe(join(PRESCRIPTION_UPLOAD_DIR, 'abc.pdf'))
  })

  it('rejects traversal attempts', () => {
    for (const key of ['../secret.env', '..\\secret.env', '/etc/passwd', 'a/../../b']) {
      expect(() => resolvePrescriptionPath(key)).toThrow(/invalid/i)
    }
  })

  // Rows written before this change stored a public path.
  it('tolerates a legacy /uploads/ prefix', () => {
    expect(resolvePrescriptionPath('/uploads/legacy.pdf')).toBe(
      join(PRESCRIPTION_UPLOAD_DIR, 'legacy.pdf')
    )
  })
})

describe('savePrescriptionFile', () => {
  it('returns a key matching the upload extension', async () => {
    const key = await savePrescriptionFile(Buffer.from('rx-bytes'), 'scan.png')
    written.push(key)

    expect(key).toMatch(/\.png$/)
  })
})

// EP-010 BUG-007 (Risk TECH-04 — production data encryption at rest).
// kycStorage.ts already encrypted KYC documents; this file did not, despite
// CLAUDE.md claiming all medical/Rx data is encrypted at rest — a
// pre-existing, explicitly-flagged gap (see kycStorage.ts's prior comment).
// Same shape as kycStorage.test.ts's encryption suite: proving the
// plaintext never touches disk, not just that save/read round-trips.
describe('savePrescriptionFile / readPrescriptionFile — encryption at rest', () => {
  it('never writes the plaintext bytes to disk', async () => {
    const plaintext = Buffer.from('CONFIDENTIAL prescription: SPH -2.50 CYL -0.75')
    const key = await savePrescriptionFile(plaintext, 'scan.pdf')
    written.push(key)

    const onDisk = await readFile(join(PRESCRIPTION_UPLOAD_DIR, key))
    expect(onDisk.includes(plaintext)).toBe(false)
    expect(onDisk.toString('latin1')).not.toContain('CONFIDENTIAL')
  })

  it('decrypts back to the exact original bytes', async () => {
    const plaintext = Buffer.from('exact original bytes, including \x00 nulls')
    const key = await savePrescriptionFile(plaintext, 'scan.pdf')
    written.push(key)

    const decrypted = await readPrescriptionFile(key)
    expect(decrypted.equals(plaintext)).toBe(true)
  })

  it('produces different ciphertext for the same plaintext on repeated saves', async () => {
    const plaintext = Buffer.from('identical content')
    const key1 = await savePrescriptionFile(plaintext, 'a.pdf')
    const key2 = await savePrescriptionFile(plaintext, 'b.pdf')
    written.push(key1, key2)

    const bytes1 = await readFile(join(PRESCRIPTION_UPLOAD_DIR, key1))
    const bytes2 = await readFile(join(PRESCRIPTION_UPLOAD_DIR, key2))
    expect(bytes1.equals(bytes2)).toBe(false)
  })

  it('rejects a tampered ciphertext rather than silently returning garbage', async () => {
    const key = await savePrescriptionFile(Buffer.from('original'), 'scan.pdf')
    written.push(key)

    const path = resolvePrescriptionPath(key)
    const tampered = await readFile(path)
    tampered[tampered.length - 1] ^= 0xff
    await writeFile(path, tampered)

    await expect(readPrescriptionFile(key)).rejects.toThrow()
  })
})

describe('readPrescriptionFile', () => {
  it('refuses to read outside the upload directory', async () => {
    await expect(readPrescriptionFile('../../.env.local')).rejects.toThrow(/invalid/i)
  })
})
