import { NextRequest } from 'next/server';
import { clean, validateAnswers, answerLimitFor } from '@/lib/discovery/model';
import { readRecord, tokenId, writeRecord } from '@/lib/discovery/store';
import { bodyJson, failure, HttpError, json } from '@/lib/discovery/security';
export const runtime = 'nodejs';
export async function POST(request: NextRequest) {
  try {
    const body = await bodyJson(request);
    if (typeof body.token !== 'string' || !/^[A-Za-z0-9_-]{43}$/.test(body.token)) throw new HttpError(404, 'Convite não encontrado. Confira o link recebido.');
    const stored = await readRecord(tokenId(body.token));
    if (!stored || stored.record.evidenceType === 'academic_case' || stored.record.status === 'revoked') throw new HttpError(404, 'Convite não encontrado ou encerrado.');
    const record = stored.record;
    if (record.status === 'submitted' || record.status === 'reviewed') return json({ completed: true, receipt: record.id.slice(0, 12).toUpperCase(), company: record.company });
    if (Date.parse(record.expiresAt) < Date.now()) throw new HttpError(410, 'Este convite expirou. Peça um novo link à WiseTIConsulting.');
    if (body.action === 'open') return json({ company: record.company, segment: record.segment, status: record.status, answers: record.answers, respondent: record.respondent, email: record.email, questionnaireVersion: record.questionnaireVersion, consented: !!record.consentAt });
    if (!['draft', 'submit'].includes(String(body.action))) throw new HttpError(400, 'Operação inválida.');
    if (body.consent !== true) throw new HttpError(400, 'Confirme que deseja participar da pesquisa.');
    try {
      record.answers = validateAnswers(body.answers, body.action === 'submit', record.questionnaireVersion);
      record.respondent = clean(body.respondent ?? '', 120);
      record.email = clean(body.email ?? '', 254);
      if (record.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(record.email)) throw new Error('Email inválido.');
    } catch { throw new HttpError(400, `Revise os campos. As perguntas essenciais precisam de pelo menos 10 caracteres; cada resposta aceita até ${answerLimitFor(record.questionnaireVersion).toLocaleString('pt-BR')} caracteres.`); }
    record.consentAt ||= new Date().toISOString();
    record.updatedAt = new Date().toISOString();
    record.status = body.action === 'submit' ? 'submitted' : 'draft';
    if (record.status === 'submitted') record.submittedAt = record.updatedAt;
    await writeRecord(record, stored.etag);
    return json({ saved: true, completed: record.status === 'submitted', receipt: record.id.slice(0, 12).toUpperCase() });
  } catch (error) { return failure(error); }
}
