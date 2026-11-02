import { randomBytes } from 'node:crypto';
import { NextRequest } from 'next/server';
import { clean, QUESTIONNAIRE_VERSION, type DiscoveryRecord } from '@/lib/discovery/model';
import { listRecords, tokenId, writeRecord } from '@/lib/discovery/store';
import { bodyJson, failure, HttpError, json } from '@/lib/discovery/security';
export const runtime = 'nodejs';
let windowEnd = 0, count = 0;
export async function POST(request: NextRequest) {
  try {
    const body = await bodyJson(request);
    if (Date.now() > windowEnd) { windowEnd = Date.now() + 60_000; count = 0; }
    if (++count > 10) throw new HttpError(429, 'Muitos cadastros neste momento. Aguarde um minuto.');
    let name: string, email: string;
    try {
      name = clean(body.name, 120, 2); email = clean(body.email, 254, 5);
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) throw new Error();
    } catch { throw new HttpError(400, 'Informe seu nome e um e-mail válido.'); }
    if (body.consent !== true) throw new HttpError(400, 'Confirme sua participação voluntária.');
    if ((await listRecords()).records.length >= 200) throw new HttpError(409, 'O piloto atingiu sua capacidade. Entre em contato com a Wise.');
    // A fresh capability for every registration: email never grants access to another record.
    const token = randomBytes(32).toString('base64url'), now = new Date().toISOString();
    const record: DiscoveryRecord = { id: tokenId(token), company: `Negócio de ${name}`, segment: 'Outro',
      createdAt: now, updatedAt: now, expiresAt: new Date(Date.now() + 30 * 86400000).toISOString(),
      consentAt: now, status: 'draft', answers: {}, respondent: name, email, notes: '', nextStep: '',
      evidenceType: 'self_report', questionnaireVersion: QUESTIONNAIRE_VERSION };
    await writeRecord(record);
    return json({ token, invite: { company: record.company, segment: record.segment, status: record.status,
      answers: {}, respondent: name, email, consented: true, questionnaireVersion: QUESTIONNAIRE_VERSION } }, 201);
  } catch (error) { return failure(error); }
}
