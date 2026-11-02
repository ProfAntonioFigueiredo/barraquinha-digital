import { NextRequest } from 'next/server';
import { bodyJson, failure, HttpError, isAdmin, json, limitLogin, setSession, validAdminKey } from '@/lib/discovery/security';
export const runtime = 'nodejs';
export async function GET(request: NextRequest) {
  try { return json({ authenticated: isAdmin(request) }); } catch (error) { return failure(error); }
}
export async function POST(request: NextRequest) {
  try {
    const body = await bodyJson(request);
    if (body.logout === true) return setSession(json({ ok: true }), true);
    limitLogin();
    if (typeof body.key !== 'string' || !validAdminKey(body.key)) throw new HttpError(401, 'Código de acesso incorreto.');
    return setSession(json({ authenticated: true }));
  } catch (error) { return failure(error); }
}
