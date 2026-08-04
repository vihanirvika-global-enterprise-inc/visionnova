import { describe, it, expect } from 'vitest'
import { serverActionAllowedOrigins } from './serverActionOrigins.mjs'

describe('serverActionAllowedOrigins', () => {
  it('returns undefined in production so the strict CSRF default is kept', () => {
    expect(serverActionAllowedOrigins({ isDev: false, port: '3000' })).toBeUndefined()
  })

  it('allows the loopback hosts the dev server is reachable on', () => {
    const origins = serverActionAllowedOrigins({ isDev: true, port: '3000' })

    expect(origins).toContain('localhost:3000')
    expect(origins).toContain('127.0.0.1:3000')
    expect(origins).toContain('[::1]:3000')
  })

  it('tracks a non-default port', () => {
    const origins = serverActionAllowedOrigins({ isDev: true, port: '3001' })

    expect(origins).toContain('localhost:3001')
    expect(origins).not.toContain('localhost:3000')
  })

  it('defaults to port 3000 when PORT is unset', () => {
    expect(serverActionAllowedOrigins({ isDev: true })).toContain('localhost:3000')
  })

  // A proxy, tunnel or forwarded port serves the app on a host neither the
  // config nor the developer can predict. This is the escape hatch for it.
  it('appends extra origins supplied by env', () => {
    const origins = serverActionAllowedOrigins({
      isDev: true,
      port: '3000',
      extraOrigins: 'foo.devtunnels.ms, bar.ngrok.io',
    })

    expect(origins).toContain('foo.devtunnels.ms')
    expect(origins).toContain('bar.ngrok.io')
  })

  it('ignores blank entries in the env list', () => {
    const origins = serverActionAllowedOrigins({
      isDev: true,
      port: '3000',
      extraOrigins: ' , ,foo.example.com, ',
    })

    expect(origins).toContain('foo.example.com')
    expect(origins?.every((origin) => origin.trim().length > 0)).toBe(true)
  })

  // Production must stay strict even if the env var is set — otherwise a value
  // left in a deployment's environment would silently widen CSRF acceptance.
  it('ignores extra origins in production', () => {
    expect(
      serverActionAllowedOrigins({ isDev: false, extraOrigins: 'evil.example.com' }),
    ).toBeUndefined()
  })
})
