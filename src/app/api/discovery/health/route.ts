import { verifyStorage } from '@/lib/discovery/store';
import { json, verifySecurity } from '@/lib/discovery/security';
export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export async function GET() {
  try { verifySecurity(); await verifyStorage(); return json({ status: 'ok' }); }
  catch { return json({ status: 'unavailable' }, 503); }
}
