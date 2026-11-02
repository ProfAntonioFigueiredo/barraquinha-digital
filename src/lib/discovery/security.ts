import { createHmac, randomBytes, timingSafeEqual } from 'node:crypto';
import { NextRequest, NextResponse } from 'next/server';
import { StoreConflict } from './store';

const COOKIE = 'wise_discovery_admin';
function secret() {
  const value = process.env.DISCOVERY_SESSION_SECRET;
  if (!value || value.length < 32) throw new Error('Administração não configurada.');
  if (process.env.NODE_ENV === 'production' && process.env.DISCOVERY_SECURE_COOKIE !== 'true' && process.env.DISCOVERY_LOCAL_STORAGE !== 'true') throw new Error('HTTPS obrigatório em produção.');
  return value;
}
function equal(a: string, b: string) {
  const x = Buffer.from(a), y = Buffer.from(b);
  return x.length === y.length && timingSafeEqual(x, y);
}
export function validAdminKey(key: string) {
  const expected = process.env.DISCOVERY_ADMIN_KEY;
  return !!expected && expected.length >= 32 && key.length <= 256 && equal(key, expected);
}
export function verifySecurity() {
  secret();
  if (!process.env.DISCOVERY_ADMIN_KEY || process.env.DISCOVERY_ADMIN_KEY.length < 32) throw new Error('Administração não configurada.');
  if (process.env.NODE_ENV === 'production' && process.env.DISCOVERY_LOCAL_STORAGE !== 'true' && !process.env.DISCOVERY_ORIGIN?.startsWith('https://')) throw new Error('Origem HTTPS obrigatória.');
}
export function sessionValue() {
  const value = `${Math.floor(Date.now() / 1000) + 8 * 3600}.${randomBytes(16).toString('hex')}`;
  return value + '.' + createHmac('sha256', secret()).update(value).digest('hex');
}
export function isAdmin(request: NextRequest) {
  const token = request.cookies.get(COOKIE)?.value ?? '';
  if (!/^\d+\.[a-f0-9]{32}\.[a-f0-9]{64}$/.test(token)) return false;
  const [expires, nonce, signature] = token.split('.');
  if (Number(expires) <= Date.now() / 1000) return false;
  return equal(signature, createHmac('sha256', secret()).update(`${expires}.${nonce}`).digest('hex'));
}
export function setSession(response: NextResponse, logout = false) {
  response.cookies.set(COOKIE, logout ? '' : sessionValue(), {
    httpOnly: true, secure: process.env.DISCOVERY_SECURE_COOKIE === 'true', sameSite: 'strict', path: '/api/discovery', maxAge: logout ? 0 : 8 * 3600,
  });
  return response;
}
export function requireAdmin(request: NextRequest) { if (!isAdmin(request)) throw new HttpError(401, 'Entre na área de acompanhamento.'); }
export class HttpError extends Error { constructor(public status: number, message: string) { super(message); } }
export function sameOrigin(request: NextRequest) {
  const expected = process.env.DISCOVERY_ORIGIN || request.nextUrl.origin;
  const additional = process.env.DISCOVERY_ADDITIONAL_ORIGIN;
  const allowed = [expected, ...(additional?.startsWith('https://') ? [additional] : [])];
  if (!allowed.includes(request.headers.get('origin') || '')) throw new HttpError(403, 'Origem não autorizada.');
  if (!request.headers.get('content-type')?.startsWith('application/json')) throw new HttpError(415, 'Envie dados JSON.');
}
export async function bodyJson(request: NextRequest): Promise<Record<string, unknown>> {
  sameOrigin(request);
  const reader = request.body?.getReader();
  if (!reader) throw new HttpError(400, 'Dados ausentes.');
  let size = 0; const chunks: Uint8Array[] = [];
  while (true) {
    const part = await reader.read(); if (part.done) break;
    size += part.value.byteLength;
    if (size > 512_000) { await reader.cancel(); throw new HttpError(413, 'Respostas muito longas.'); }
    chunks.push(part.value);
  }
  let obj;
  try { obj = JSON.parse(Buffer.concat(chunks).toString('utf8')); } catch { throw new HttpError(400, 'Dados inválidos.'); }
  if (!obj || typeof obj !== 'object' || Array.isArray(obj)) throw new HttpError(400, 'Dados inválidos.');
  return obj;
}
export function json(data: unknown, status = 200) {
  return NextResponse.json(data, { status, headers: { 'Cache-Control': 'no-store', 'X-Content-Type-Options': 'nosniff', 'Referrer-Policy': 'no-referrer' } });
}
export function failure(error: unknown) {
  if (error instanceof HttpError) return json({ error: error.message }, error.status);
  if (error instanceof StoreConflict) return json({ error: 'Este registro foi atualizado. Recarregue antes de tentar novamente.' }, 409);
  return json({ error: 'Não foi possível concluir. Tente novamente em instantes.' }, 503);
}
const attempts = new Map<string, { count: number; until: number }>();
export function limitLogin() {
  // Global per-instance ceiling prevents forged proxy IPs bypassing the limit.
  const key = 'admin-login'; const now = Date.now(); const current = attempts.get(key);
  if (!current || current.until < now) { attempts.set(key, { count: 1, until: now + 60_000 }); return; }
  if (++current.count > 10) throw new HttpError(429, 'Aguarde um minuto antes de tentar novamente.');
}
