// Deliberately dependency-free so client components can import it.
//
// This lived in validation.ts, but that module reaches the database (via
// ./customers for the duplicate-email precheck), so importing it from the
// register form pulled `postgres` into the browser bundle and failed the
// build. The rule itself is just a number; the server keeps enforcing it and
// the form now describes the same one.
export const MIN_PASSWORD_LENGTH = 10
