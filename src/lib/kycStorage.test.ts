import { describe, it, expect, afterEach } from 'vitest'
import { rm, readFile, mkdir, writeFile } from 'fs/promises'
import { join } from 'path'
import {
  KYC_UPLOAD_DIR,
  buildKycStorageKey,
  resolveKycPath,
  saveKycDocument,
  readKycDocument,
} from './kycStorage'

const written: string[] = []

afterEach(async () => {
  for (const key of written.splice(0)) {
    await rm(join(KYC_UPLOAD_DIR, key), { force: true })
  }
})

describe('KYC_UPLOAD_DIR', () => {
  it('is outside the public directory', () => {
    expect(KYC_UPLOAD_DIR).not.toMatch(/[\\/]public[\\/]/)
  })

  it('is a directory distinct from prescription uploads', async () => {
    const { PRESCRIPTION_UPLOAD_DIR } = await import('./prescriptionStorage')
    expect(KYC_UPLOAD_DIR).not.toBe(PRESCRIPTION_UPLOAD_DIR)
  })
})

describe('buildKycStorageKey', () => {
  it('does not derive the name from user input', () => {
    const key = buildKycStorageKey('business-license.pdf')
    expect(key).not.toContain('business-license')
    expect(key).toMatch(/^[0-9a-f-]{36}\.pdf$/)
  })
})

describe('resolveKycPath', () => {
  it('rejects traversal attempts', () => {
    for (const key of ['../secret.env', '..\\secret.env', '/etc/passwd']) {
      expect(() => resolveKycPath(key)).toThrow(/invalid/i)
    }
  })
})

// ST-021 ("KYC documents encrypted at rest"). The whole point of these
// tests: proving the plaintext never touches disk, not just that
// save/read round-trips (a passthrough with no encryption would also pass
// a naive round-trip test).
describe('saveKycDocument / readKycDocument — encryption at rest', () => {
  it('never writes the plaintext bytes to disk', async () => {
    const plaintext = Buffer.from('CONFIDENTIAL business registration document contents')
    const key = await saveKycDocument(plaintext, 'license.pdf')
    written.push(key)

    const onDisk = await readFile(join(KYC_UPLOAD_DIR, key))
    expect(onDisk.includes(plaintext)).toBe(false)
    expect(onDisk.toString('latin1')).not.toContain('CONFIDENTIAL')
  })

  it('decrypts back to the exact original bytes', async () => {
    const plaintext = Buffer.from('exact original bytes, including \x00 nulls')
    const key = await saveKycDocument(plaintext, 'doc.pdf')
    written.push(key)

    const decrypted = await readKycDocument(key)
    expect(decrypted.equals(plaintext)).toBe(true)
  })

  it('produces different ciphertext for the same plaintext on repeated saves', async () => {
    const plaintext = Buffer.from('identical content')
    const key1 = await saveKycDocument(plaintext, 'a.pdf')
    const key2 = await saveKycDocument(plaintext, 'b.pdf')
    written.push(key1, key2)

    const bytes1 = await readFile(join(KYC_UPLOAD_DIR, key1))
    const bytes2 = await readFile(join(KYC_UPLOAD_DIR, key2))
    // A fresh random IV per save means identical plaintext never produces
    // identical ciphertext — otherwise two identical KYC docs would be
    // distinguishable from their encrypted bytes alone.
    expect(bytes1.equals(bytes2)).toBe(false)
  })

  it('rejects a tampered ciphertext rather than silently returning garbage', async () => {
    const key = await saveKycDocument(Buffer.from('original'), 'doc.pdf')
    written.push(key)

    const path = resolveKycPath(key)
    const tampered = await readFile(path)
    tampered[tampered.length - 1] ^= 0xff // flip the last byte
    await writeFile(path, tampered)

    await expect(readKycDocument(key)).rejects.toThrow()
  })
})

describe('readKycDocument', () => {
  it('refuses to read outside the upload directory', async () => {
    await expect(readKycDocument('../../.env.local')).rejects.toThrow(/invalid/i)
  })
})
