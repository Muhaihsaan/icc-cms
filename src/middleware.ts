import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

const TOP_LEVEL_COOKIE = 'icc-top-level'
const TOP_LEVEL_HEADER = 'x-icc-top-level'

export function middleware(request: NextRequest) {
  const topLevelCookie = request.cookies.get(TOP_LEVEL_COOKIE)
  // DEBUG: Remove after fixing
  console.log('[middleware]', request.nextUrl.pathname, 'cookie:', topLevelCookie?.value)
  if (!topLevelCookie) return NextResponse.next()
  if (topLevelCookie.value !== 'true') return NextResponse.next()

  // Add header for server-side access control to read
  const requestHeaders = new Headers(request.headers)
  requestHeaders.set(TOP_LEVEL_HEADER, 'true')

  return NextResponse.next({
    request: { headers: requestHeaders },
  })
}

export const config = {
  matcher: '/admin/:path*',
}
