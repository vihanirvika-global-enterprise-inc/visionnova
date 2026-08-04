// Origins accepted for Server Action POSTs in local development.
//
// Next.js protects Server Actions from CSRF by requiring the `Origin` header's
// host to equal the `Host` (or `x-forwarded-host`) header. When anything sits
// between the browser and `next dev` — a proxy, an editor's forwarded port, a
// tunnel — those two disagree and every action fails with the opaque
// "Invalid Server Actions request." (next/dist/server/app-render/action-handler,
// gated by isCsrfOriginAllowed). Registration was the first place we hit it.
//
// Plain .mjs for the same reason as csp.mjs: next.config.js imports it directly.
//
// This ONLY widens local development. In production the function returns
// undefined, so Next keeps its strict same-host default and this file cannot
// weaken the deployed app's CSRF posture.

const DEFAULT_PORT = '3000'

/**
 * @param {{ isDev?: boolean, port?: string, extraOrigins?: string }} options
 * @returns {string[] | undefined} allowedOrigins for experimental.serverActions,
 *   or undefined to leave Next's strict default in place.
 */
export function serverActionAllowedOrigins({ isDev, port, extraOrigins } = {}) {
  if (!isDev) return undefined

  const resolvedPort = port || DEFAULT_PORT

  // Compared against `new URL(origin).host`, which always carries the port.
  const loopback = [
    `localhost:${resolvedPort}`,
    `127.0.0.1:${resolvedPort}`,
    `[::1]:${resolvedPort}`,
  ]

  const extra = (extraOrigins || '')
    .split(',')
    .map((origin) => origin.trim())
    .filter(Boolean)

  return [...loopback, ...extra]
}
