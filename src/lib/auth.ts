import { SignJWT, jwtVerify } from 'jose';
import { cookies } from 'next/headers';
import { NextRequest } from 'next/server';

const SECRET_KEY = new TextEncoder().encode(
  process.env.SESSION_SECRET || 'car-rental-default-session-secret-production-2026'
);

const COOKIE_NAME = 'carrent_token';

/**
 * Signs and sets a JWT cookie
 */
export async function createSession(userData: any): Promise<string> {
  const token = await new SignJWT(userData)
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime('8h')
    .sign(SECRET_KEY);

  const cookieStore = cookies();
  cookieStore.set(COOKIE_NAME, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge: 8 * 60 * 60, // 8 hours
    path: '/',
  });

  return token;
}

/**
 * Reads and verifies current session user
 */
export async function getSessionUser(): Promise<any | null> {
  try {
    const cookieStore = cookies();
    const token = cookieStore.get(COOKIE_NAME)?.value;
    if (!token) return null;

    const { payload } = await jwtVerify(token, SECRET_KEY);
    return payload;
  } catch (err) {
    return null;
  }
}

/**
 * Clears session cookie (logout)
 */
export async function destroySession(): Promise<void> {
  const cookieStore = cookies();
  cookieStore.delete(COOKIE_NAME);
}

/**
 * Returns tenant company_id for the current request
 */
export function getTenantId(req: Request | NextRequest, sessionUser: any): number | null {
  if (sessionUser?.role === 'superadmin') {
    const headerCompany = req.headers.get('x-company-id');
    if (headerCompany && !isNaN(parseInt(headerCompany))) {
      return parseInt(headerCompany);
    }
    const url = new URL(req.url);
    const queryCompany = url.searchParams.get('company_id');
    if (queryCompany && !isNaN(parseInt(queryCompany))) {
      return parseInt(queryCompany);
    }
    if (sessionUser.activeCompanyId) {
      return sessionUser.activeCompanyId;
    }
  }
  return sessionUser?.companyId || null;
}
