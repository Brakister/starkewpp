import { NextRequest, NextResponse } from 'next/server'
import { verifyToken } from '@/lib/auth'

// Routes that don't require auth
const PUBLIC_ROUTES = [
  '/login',
  '/api/auth/login',
  '/api/webhooks/whatsapp',
  '/api/socket',
]

export async function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl

  // Allow public routes
  if (PUBLIC_ROUTES.some(r => pathname.startsWith(r))) {
    return NextResponse.next()
  }

  // Allow static files
  if (pathname.startsWith('/_next') || pathname.startsWith('/favicon')) {
    return NextResponse.next()
  }

  // Root redirect
  if (pathname === '/') {
    return NextResponse.redirect(new URL('/conversations', req.url))
  }

  // Check auth for dashboard routes
  const token = req.cookies.get('zapflow_session')?.value

  if (!token) {
    // API routes return 401
    if (pathname.startsWith('/api/')) {
      return NextResponse.json({ success: false, error: 'Não autorizado' }, { status: 401 })
    }
    return NextResponse.redirect(new URL('/login', req.url))
  }

  const session = await verifyToken(token)
  if (!session) {
    if (pathname.startsWith('/api/')) {
      return NextResponse.json({ success: false, error: 'Sessão expirada' }, { status: 401 })
    }
    return NextResponse.redirect(new URL('/login', req.url))
  }

  // Role-based route protection
  const adminOnlyPaths = ['/users', '/settings', '/webhooks', '/bot', '/api/users', '/api/settings', '/api/bot']
  const managerPaths = ['/reports', '/teams', '/bulk-send', '/api/reports', '/api/teams', '/api/bulk-send']

  if (adminOnlyPaths.some(p => pathname.startsWith(p)) && session.role !== 'ADMIN') {
    if (pathname.startsWith('/api/')) {
      return NextResponse.json({ success: false, error: 'Sem permissão' }, { status: 403 })
    }
    return NextResponse.redirect(new URL('/conversations', req.url))
  }

  if (managerPaths.some(p => pathname.startsWith(p)) && session.role === 'AGENT') {
    if (pathname.startsWith('/api/')) {
      return NextResponse.json({ success: false, error: 'Sem permissão' }, { status: 403 })
    }
    return NextResponse.redirect(new URL('/conversations', req.url))
  }

  return NextResponse.next()
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico).*)']
}
