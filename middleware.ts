import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { createClient } from '@supabase/supabase-js';

// Supabase client for middleware (Edge compatible)
const supabaseUrl = process.env.REACT_APP_SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const supabaseKey = process.env.REACT_APP_SUPABASE_ANON_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';

export async function middleware(req: NextRequest) {
  const res = NextResponse.next();
  const pathname = req.nextUrl.pathname;
  
  // 1. Ignorar estáticos
  if (pathname.startsWith('/_next') || pathname.includes('.')) return res;

  // 2. Logging de Tráfico (Audit Trace)
  // Nota: No bloqueamos la request esperando la DB para velocidad, 
  // pero en un entorno bancario podríamos usar `waitUntil`.
  const ip = req.ip || req.headers.get('x-forwarded-for') || 'unknown';
  const userAgent = req.headers.get('user-agent') || 'unknown';
  
  // Solo loguear accesos a áreas sensibles o APIs
  if (pathname.startsWith('/admin') || pathname.startsWith('/api') || pathname.startsWith('/ledger')) {
      // Async fire & forget (Edge limitations apply)
      console.log(`[AUDIT_TRACE] ${req.method} ${pathname} FROM ${ip}`);
  }

  // 3. Auth Guard (Token Verification)
  const publicRoutes = ['/', '/login', '/api/public'];
  if (publicRoutes.some(r => pathname === r)) return res;

  // Check Supabase Session via Cookie or Header
  // NOTE: In middleware, we mostly check presence of cookie/token. Full validation happens on API/Page.
  // This simulation assumes the cookie 'sb-access-token' or similar exists.
  // For this demo structure, we pass through if not strictly protecting logic here.
  
  // 4. Headers de Seguridad (Zero Trust)
  res.headers.set('X-Frame-Options', 'DENY');
  res.headers.set('X-Content-Type-Options', 'nosniff');
  res.headers.set('Referrer-Policy', 'strict-origin-when-cross-origin');
  res.headers.set('Permissions-Policy', 'camera=(), microphone=(), geolocation=()'); // Tighten per metadata.json

  return res;
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico).*)'],
};
