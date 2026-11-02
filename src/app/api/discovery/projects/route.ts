import { createHash } from 'node:crypto';
import { NextRequest } from 'next/server';
import content from '@/lib/discovery/cases/barraquinha.json';
import example from '@/lib/discovery/cases/barraquinha-modelo.json';
import { type DiscoveryRecord, QUESTIONNAIRE_VERSION } from '@/lib/discovery/model';
import { ARTIFACTS, inputHash, type ArtifactId } from '@/lib/discovery/studio';
import { listRecords, readRecord, writeRecord, StoreConflict } from '@/lib/discovery/store';
import { bodyJson, failure, HttpError, json, requireAdmin } from '@/lib/discovery/security';
export const runtime = 'nodejs';
export async function POST(request: NextRequest) {
  try {
    requireAdmin(request); const body = await bodyJson(request);
    if (body.project !== 'barraquinha') throw new HttpError(400, 'Projeto não reconhecido.');
    // Stable ID + exclusive create makes imports idempotent, preserving administrator edits.
    // This is not a participant capability: respond explicitly rejects academic records.
    const id = createHash('sha256').update('wise-academic-project:barraquinha:v1').digest('hex');
    const current = await readRecord(id);
    if (body.action === 'complete-test-model') {
      if (!current || current.record.evidenceType !== 'academic_case') throw new HttpError(404,'Importe o caso acadêmico primeiro.');
      if (body.etag !== current.etag) throw new HttpError(409,'Reabra o projeto antes de completar o modelo.');
      const r=current.record, now=new Date().toISOString();
      r.answers=example.answers; r.notes='MODELO FICTÍCIO preenchido a pedido do responsável para testar a aplicação Azure. Não é entrevista real, resultado comercial ou treinamento de ML.';
      r.nextStep='Validar cliente e operação em dois dispositivos nas rotas /barraquinha e /barraquinha/operacao.';
      r.updatedAt=now; r.studio??={};
      for (const stage of ARTIFACTS) {
        const text=example.artifacts[stage.id];
        r.studio![stage.id]={content:text,version:(r.studio?.[stage.id]?.version??0)+1,reviewed:true,updatedAt:now,inputHash:inputHash(r,stage.id)};
      }
      await writeRecord(r,current.etag);return json({id,completed:true});
    }
    if (current) return json({ id, created: false });
    if ((await listRecords()).records.length >= 200) throw new HttpError(409, 'Limite do piloto atingido.');
    const now = new Date().toISOString();
    const record: DiscoveryRecord = { id, company: 'Barraquinha Digital', segment: 'Alimentação / restaurante', projectKey: 'barraquinha',
      createdAt: now, updatedAt: now, expiresAt: new Date(Date.now()+90*86400000).toISOString(), status: 'draft',
      answers: {}, respondent: '', email: '', evidenceType: 'academic_case', questionnaireVersion: QUESTIONNAIRE_VERSION,
      notes: 'Caso acadêmico derivado de Barraquinha de Praia Digital.docx. Não é uma entrevista com cliente real. Documentos iniciais preparados, sem aplicação de praia construída ou modelo de ML treinado.',
      nextStep: 'Revisar Business Case, PRD, PSS, Blueprint e requisitos no Estúdio de Produto; definir as escolhas pendentes antes da ignição.', studio: {} };
    for (const stage of ARTIFACTS) {
      const text = (content as Partial<Record<ArtifactId,string>>)[stage.id];
      if (text) record.studio![stage.id] = { content:text, version:1, updatedAt:now, reviewed:false, inputHash:inputHash(record,stage.id) };
    }
    try { await writeRecord(record); } catch(e) { if (!(e instanceof StoreConflict)) throw e; return json({ id, created:false }); }
    return json({ id, created:true },201);
  } catch(error) { return failure(error); }
}
