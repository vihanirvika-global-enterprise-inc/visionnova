import { NextRequest, NextResponse } from 'next/server'

const PROTECTED = ['/account', '/checkout', '/prescription-upload']

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl
  const isProtected = PROTECTED.some((path) => pathname.startsWith(path))

  if (isProtected && !request.cookies.get('session')) {
    const loginUrl = new URL('/login', request.url)
    return NextResponse.redirect(loginUrl)
  }

  return NextResponse.next()
}

export const config = {
  matcher: ['/account/:path*', '/checkout/:path*', '/prescription-upload/:path*'],
}
