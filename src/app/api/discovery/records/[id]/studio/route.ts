import { NextRequest } from 'next/server';
import { clean } from '@/lib/discovery/model';
import { ARTIFACTS, artifactId, artifactState, ignition, inputHash, stagePrompt } from '@/lib/discovery/studio';
import { readRecord, writeRecord } from '@/lib/discovery/store';
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
    const format = request.nextUrl.searchParams.get('format');
    if (format) {
      let content: string;
      if (format === 'ignition') {
        try { content = ignition(stored.record); } catch (e) { throw new HttpError(409, (e as Error).message); }
      } else {
        const stage = request.nextUrl.searchParams.get('stage');
        if (format !== 'prompt' || !artifactId(stage)) throw new HttpError(400, 'Etapa inválida.');
        content = stagePrompt(stored.record, stage);
      }
      return new Response(content, { headers: { 'Content-Type':'text/markdown; charset=utf-8', 'Content-Disposition':'attachment; filename=wise-prompt.md', 'Cache-Control':'no-store', 'X-Content-Type-Options':'nosniff' } });
    }
    return json({ studio: stored.record.studio ?? {}, etag: stored.etag, states: Object.fromEntries(ARTIFACTS.map(a => [a.id, artifactState(stored.record,a.id)])) });
  } catch (error) { return failure(error); }
}
export async function PATCH(request: NextRequest, context: Context) {
  try {
    requireAdmin(request); const body = await bodyJson(request); const stored = await find(context);
    if (body.etag !== stored.etag) throw new HttpError(409, 'Entrevista atualizada. Reabra antes de salvar.');
    if (!artifactId(body.stage) || typeof body.reviewed !== 'boolean') throw new HttpError(400, 'Etapa ou revisão inválida.');
    let content: string;
    try { content = clean(body.content,12000,10); } catch { throw new HttpError(400, 'O documento deve ter de 10 a 12.000 caracteres.'); }
    const stage = body.stage, now = new Date().toISOString();
    const previous = stored.record.studio?.[stage];
    stored.record.studio = { ...stored.record.studio, [stage]: { content, reviewed: body.reviewed,
      version: (previous?.version ?? 0) + 1, updatedAt: now, inputHash: inputHash(stored.record,stage) } };
    stored.record.updatedAt = now;
    await writeRecord(stored.record,stored.etag);
    return json({ saved:true });
  } catch (error) { return failure(error); }
}
