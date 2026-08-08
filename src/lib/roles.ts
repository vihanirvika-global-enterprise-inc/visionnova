// /admin holds two different consoles, and they are not the same job.
//
// The ops console — dispatch queues, the customer-service lookup and the
// access-log trail — belongs to `ops`. That role has existed in the schema
// since allow-ops-role.sql but could not open a single route: middleware
// gated all of /admin on ['optometrist', 'admin'], so the role it was added
// for was locked out of the console written for it.
//
// The clinical queues — prescription review and partner KYC — stay on
// REVIEWER_ROLES in prescriptionAccess.ts, which documents the same split
// from the other side ("ops is deliberately absent: it is an operations role,
// not a clinical one"). Removing optometrist from those would lock clinical
// reviewers out of the queue that is their actual job.
export const OPS_CONSOLE_ROLES = ['ops', 'admin']

// Exact segments, so /admin/ordersomething cannot slip through a prefix
// match. Nested paths under a console route are included.
const OPS_CONSOLE_SEGMENTS = ['compliance', 'orders', 'support']

export function isOpsConsolePath(pathname: string): boolean {
  return OPS_CONSOLE_SEGMENTS.some(
    (segment) => pathname === `/admin/${segment}` || pathname.startsWith(`/admin/${segment}/`)
  )
}
