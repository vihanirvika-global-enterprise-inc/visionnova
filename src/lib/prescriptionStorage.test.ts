import { describe, it, expect, afterEach } from 'vitest'
import { rm, readFile, mkdir, writeFile } from 'fs/promises'
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
  it('writes the bytes and returns the key to store', async () => {
    const key = await savePrescriptionFile(Buffer.from('rx-bytes'), 'scan.png')
    written.push(key)

    const onDisk = await readFile(join(PRESCRIPTION_UPLOAD_DIR, key))
    expect(onDisk.toString()).toBe('rx-bytes')
    expect(key).toMatch(/\.png$/)
  })
})

describe('readPrescriptionFile', () => {
  it('reads a stored file back by key', async () => {
    await mkdir(PRESCRIPTION_UPLOAD_DIR, { recursive: true })
    await writeFile(join(PRESCRIPTION_UPLOAD_DIR, 'read-me.pdf'), 'contents')
    written.push('read-me.pdf')

    expect((await readPrescriptionFile('read-me.pdf')).toString()).toBe('contents')
  })

  it('refuses to read outside the upload directory', async () => {
    await expect(readPrescriptionFile('../../.env.local')).rejects.toThrow(/invalid/i)
  })
})
