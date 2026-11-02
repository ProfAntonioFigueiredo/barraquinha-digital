import { randomBytes } from 'node:crypto';
import { NextRequest } from 'next/server';
import { clean, type DiscoveryRecord, SEGMENTS, QUESTIONNAIRE_VERSION } from '@/lib/discovery/model';
import { listRecords, tokenId, writeRecord } from '@/lib/discovery/store';
import { bodyJson, failure, HttpError, json, requireAdmin } from '@/lib/discovery/security';
export const runtime = 'nodejs';
export async function GET(request: NextRequest) {
  try {
    requireAdmin(request);
    const { records, truncated } = await listRecords();
    return json({ records: records.map(r => ({ id: r.id, company: r.company, segment: r.segment, status: r.status, createdAt: r.createdAt, updatedAt: r.updatedAt, submittedAt: r.submittedAt, evidenceType: r.evidenceType, projectKey: r.projectKey })), truncated });
  } catch (error) { return failure(error); }
}
export async function POST(request: NextRequest) {
  try {
    requireAdmin(request);
    const body = await bodyJson(request);
    let company: string, segment: string;
    try { company = clean(body.company, 160, 2); segment = clean(body.segment, 80, 2); }
    catch { throw new HttpError(400, 'Informe empresa e segmento.'); }
    if (!SEGMENTS.includes(segment)) throw new HttpError(400, 'Escolha um segmento da lista.');
    if ((await listRecords()).records.length >= 200) throw new HttpError(409, 'O limite deste piloto é de 200 entrevistas. Organize ou exclua registros antes de criar novos convites.');
    const token = randomBytes(32).toString('base64url');
    const now = new Date().toISOString();
    const record: DiscoveryRecord = { id: tokenId(token), company, segment, createdAt: now, updatedAt: now,
      expiresAt: new Date(Date.now() + 30 * 86400000).toISOString(), status: 'invited', answers: {}, respondent: '', email: '', notes: '', nextStep: '', evidenceType: 'self_report', questionnaireVersion: QUESTIONNAIRE_VERSION };
    await writeRecord(record);
    const origin = process.env.DISCOVERY_ORIGIN || request.nextUrl.origin;
    return json({ id: record.id, url: `${origin}/discovery#convite=${token}`, expiresAt: record.expiresAt }, 201);
  } catch (error) { return failure(error); }
}
