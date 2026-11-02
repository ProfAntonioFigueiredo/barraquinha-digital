import { exportPipeline } from '@/lib/discovery/pipeline';
import { NextRequest } from 'next/server';
import { clean, exportMarkdown } from '@/lib/discovery/model';
import { deleteRecord, readRecord, writeRecord } from '@/lib/discovery/store';
import { bodyJson, failure, HttpError, json, requireAdmin } from '@/lib/discovery/security';
export const runtime = 'nodejs';
type Context = { params: Promise<{ id: string }> };
async function find(context: Context) {
  const { id } = await context.params;
  if (!/^[a-f0-9]{64}$/.test(id)) throw new HttpError(404, 'Registro não encontrado.');
  const stored = await readRecord(id);
  if (!stored) throw new HttpError(404, 'Registro não encontrado.');
  return stored;
}
export async function GET(request: NextRequest, context: Context) {
  try {
    requireAdmin(request); const stored = await find(context);
    if (request.nextUrl.searchParams.get('format') === 'pipeline') return new Response(exportPipeline(stored.record), { headers: { 'Content-Type': 'text/markdown; charset=utf-8', 'Content-Disposition': 'attachment; filename=discovery-prompts.md', 'Cache-Control': 'no-store' } });
    if (request.nextUrl.searchParams.get('format') === 'markdown') return new Response(exportMarkdown(stored.record), { headers: {
      'Content-Type': 'text/markdown; charset=utf-8', 'Content-Disposition': `attachment; filename="discovery-${stored.record.id.slice(0, 12)}.md"`, 'Cache-Control': 'no-store',
    }});
    return json(stored);
  } catch (error) { return failure(error); }
}
export async function PATCH(request: NextRequest, context: Context) {
  try {
    requireAdmin(request); const body = await bodyJson(request); const stored = await find(context);
    if (body.etag !== stored.etag) throw new HttpError(409, 'Registro atualizado por outra sessão. Reabra a entrevista.');
    if (body.action === 'revoke') stored.record.status = 'revoked';
    else {
      try { stored.record.notes = clean(body.notes ?? '', 8000); stored.record.nextStep = clean(body.nextStep ?? '', 2000); }
      catch { throw new HttpError(400, 'Análise muito longa.'); }
      if (stored.record.status === 'submitted') stored.record.status = 'reviewed';
    }
    stored.record.updatedAt = new Date().toISOString();
    await writeRecord(stored.record, stored.etag);
    return json({ saved: true });
  } catch (error) { return failure(error); }
}
export async function DELETE(request: NextRequest, context: Context) {
  try {
    requireAdmin(request); const body = await bodyJson(request); const stored = await find(context);
    if (body.etag !== stored.etag) throw new HttpError(409, 'Reabra a entrevista antes de excluir.');
    await deleteRecord(stored.record.id, stored.etag);
    return json({ deleted: true });
  } catch (error) { return failure(error); }
}
