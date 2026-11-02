import assert from 'node:assert/strict';
import { readFile, writeFile } from 'node:fs/promises';
const origin = process.env.TEST_DISCOVERY_ORIGIN || 'http://127.0.0.1:3000';
const settings = process.env.TEST_DISCOVERY_ADMIN_KEY ? {} : Object.fromEntries((await readFile('.env.local', 'utf8')).split('\n').filter(s => s.includes('=')).map(s => [s.slice(0, s.indexOf('=')), s.slice(s.indexOf('=') + 1)]));
const key = process.env.TEST_DISCOVERY_ADMIN_KEY || settings.DISCOVERY_ADMIN_KEY;
let cookie = ''; const owned = [];
async function call(path, method = 'GET', data, auth = true, requestOrigin = origin) {
  const response = await fetch(origin + '/api/discovery/' + path, { method, headers: {
    'Content-Type': 'application/json', Origin: requestOrigin, ...(auth && cookie ? { Cookie: cookie } : {}),
  }, ...(data ? { body: JSON.stringify(data) } : {}) });
  const result = response.headers.get('content-type')?.includes('application/json') ? await response.json() : await response.text();
  return { response, status: response.status, result };
}
try {
  assert.equal((await call('invitations', 'GET', null, false)).status, 401);
  assert.equal((await call('session', 'POST', { key: 'invalid-key' }, false)).status, 401);
  assert.equal((await call('session', 'POST', { key }, false, 'https://untrusted.invalid')).status, 403);
  const login = await call('session', 'POST', { key }, false);
  assert.equal(login.status, 200);
  cookie = login.response.headers.get('set-cookie').split(';')[0];
  assert.match(login.response.headers.get('set-cookie'), /HttpOnly/i);
  assert.match(login.response.headers.get('set-cookie'), /SameSite=strict/i);
  assert.equal((await call('session')).result.authenticated, true);
  assert.equal((await call('register', 'POST', { name: 'Teste', email: 'invalido', consent: true }, false)).status, 400);
  assert.equal((await call('register', 'POST', { name: 'Teste', email: 'teste@example.invalid', consent: false }, false)).status, 400);
  const registrations = [];
  for (let i = 0; i < 2; i++) {
    const signup = await call('register', 'POST', { name: 'Cadastro sintético', email: 'teste@example.invalid', consent: true }, false);
    assert.equal(signup.status, 201);
    const { createHash } = await import('node:crypto');
    owned.push({ id: createHash('sha256').update(signup.result.token).digest('hex'), token: signup.result.token });
    registrations.push(owned.at(-1));
    const openedSignup = await call('respond', 'POST', { token: signup.result.token, action: 'open' }, false);
    assert.equal(openedSignup.result.consented, true);
    assert.equal(openedSignup.result.respondent, 'Cadastro sintético');
  }
  assert.notEqual(registrations[0].token, registrations[1].token);
  const prompts = await call('records/' + registrations[0].id + '?format=pipeline');
  assert.equal(prompts.status, 200); assert.match(prompts.result, /modelo de IA não configurado/);
  assert.equal((await call('records/' + registrations[0].id + '?format=pipeline', 'GET', null, false)).status, 401);
  for (const company of ['Pesquisa sintética A', 'Pesquisa sintética B']) {
    const created = await call('invitations', 'POST', { company, segment: 'Varejo' });
    assert.equal(created.status, 201);
    assert.equal(new URL(created.result.url).origin, process.env.TEST_DISCOVERY_CANONICAL_ORIGIN || origin);
    assert.equal(created.result.url.includes('?'), false);
    owned.push({ id: created.result.id, token: new URL(created.result.url).hash.slice(9) });
  }
  const [a,b] = owned.slice(2);
  const opened = await call('respond', 'POST', { token: a.token, action: 'open' }, false);
  assert.equal(opened.result.company, 'Pesquisa sintética A');
  assert.equal(opened.result.questionnaireVersion, '1.1');
  assert.equal((await call('respond', 'POST', { token: a.id, action: 'open' }, false)).status, 404);
  assert.equal((await call('records/' + a.id, 'GET', null, false)).status, 401);
  const answers = Object.fromEntries(Array.from({length:10}, (_, i) => ['P'+String(i+1).padStart(2,'0'), 'Relato sintético para teste de funcionamento.']));
  assert.equal((await call('respond', 'POST', { token: a.token, action: 'submit', answers, consent: false }, false)).status, 400);
  assert.equal((await call('respond', 'POST', { token: a.token, action: 'submit', answers: {}, consent: true }, false)).status, 400);
  const expanded = Object.fromEntries(Array.from({ length: 13 }, (_, i) => ['P' + String(i + 1).padStart(2, '0'), '語'.repeat(6000)]));
  assert.equal((await call('respond', 'POST', { token: a.token, action: 'draft', answers: expanded, consent: true }, false)).status, 200);
  assert.equal((await call('respond', 'POST', { token: a.token, action: 'open' }, false)).result.answers.P13, expanded.P13);
  assert.equal((await call('respond', 'POST', { token: a.token, action: 'draft', answers: { ...expanded, P13: 'x'.repeat(6001) }, consent: true }, false)).status, 400);
  Object.assign(answers, { P11: 'Particularidades do negócio, em relato sintético.', P12: 'Exemplo real será coletado posteriormente; este é somente um teste.', P13: 'Espaço livre sintético: ' + 'detalhe '.repeat(600) });
  assert.equal((await call('respond', 'POST', { token: a.token, action: 'draft', answers, consent: true }, false)).status, 200);
  assert.equal((await call('respond', 'POST', { token: a.token, action: 'open' }, false)).result.answers.P01, answers.P01);
  assert.deepEqual((await call('respond', 'POST', { token: b.token, action: 'open' }, false)).result.answers, {});
  const submitted = await call('respond', 'POST', { token: a.token, action: 'submit', answers, consent: true }, false);
  assert.equal(submitted.result.completed, true);
  const reopened = await call('respond', 'POST', { token: a.token, action: 'open' }, false);
  assert.equal(reopened.result.completed, true);
  assert.equal(reopened.result.answers, undefined);
  const retry = await call('respond', 'POST', { token: a.token, action: 'submit', answers: { P01: 'Attempted overwrite' }, consent: true }, false);
  assert.equal(retry.result.receipt, submitted.result.receipt);
  const detail = await call('records/' + a.id);
  assert.equal(detail.result.record.answers.P01, answers.P01);
  const saved = await call('records/' + a.id, 'PATCH', { etag: detail.result.etag, notes: 'Hipótese de teste, sem evidência real.', nextStep: 'Excluir dados de teste.' });
  assert.equal(saved.status, 200);
  assert.equal((await call('records/' + a.id, 'PATCH', { etag: detail.result.etag, notes: 'Stale overwrite' })).status, 409);
  const exported = await call('records/' + a.id + '?format=markdown');
  assert.equal(exported.status, 200);
  assert.match(exported.result, /autorrelato/);
  assert.match(exported.result, /P01/);
  assert.match(exported.result, /Que outros detalhes você gostaria de compartilhar/);
  assert.ok(exported.result.includes(answers.P13.trim()));
  assert.equal(exported.result.includes(a.token), false);
  const bDetail = await call('records/' + b.id);
  assert.equal((await call('records/' + b.id, 'PATCH', { etag: bDetail.result.etag, action: 'revoke' })).status, 200);
  assert.equal((await call('respond', 'POST', { token: b.token, action: 'open' }, false)).status, 404);
  if (process.env.TEST_DISCOVERY_DATA_DIR) {
    const legacy = await call('invitations', 'POST', { company: 'Entrevista legada sintética', segment: 'Outro' });
    owned.push({ id: legacy.result.id, token: new URL(legacy.result.url).hash.slice(9) });
    const filename = process.env.TEST_DISCOVERY_DATA_DIR + '/' + legacy.result.id + '.json';
    const record = JSON.parse(await readFile(filename, 'utf8'));
    record.questionnaireVersion = '1.0';
    await writeFile(filename, JSON.stringify(record));
    const legacyToken = owned.at(-1).token;
    assert.equal((await call('respond', 'POST', { token: legacyToken, action: 'open' }, false)).result.questionnaireVersion, '1.0');
    const oldAnswers = Object.fromEntries(Object.entries(answers).filter(([id]) => Number(id.slice(1)) <= 10));
    assert.equal((await call('respond', 'POST', { token: legacyToken, action: 'submit', answers, consent: true }, false)).status, 400);
    assert.equal((await call('respond', 'POST', { token: legacyToken, action: 'submit', answers: oldAnswers, consent: true }, false)).status, 200);
    const oldExport = await call('records/' + legacy.result.id + '?format=markdown');
    assert.match(oldExport.result, /Como aconteceu o último atendimento ou pedido/);
    assert.equal(oldExport.result.includes('Que outros detalhes você gostaria de compartilhar'), false);
  }
  const studioPath = 'records/' + a.id + '/studio';
  assert.equal((await call(studioPath, 'GET', null, false)).status, 401);
  assert.equal((await call(studioPath + '?format=ignition')).status, 409);
  const stagePrompt = await call(studioPath + '?format=prompt&stage=prd');
  assert.match(stagePrompt.result, /PRD/); assert.ok(stagePrompt.result.includes(answers.P01));
  let snapshot = await call(studioPath);
  assert.equal((await call(studioPath, 'PATCH', { etag: snapshot.result.etag, stage: 'not-a-stage', content: 'invalid stage content', reviewed: true })).status, 400);
  const prdContent = 'RF-01: requisito sintético, somente para teste. Não construir aplicação.';
  assert.equal((await call(studioPath, 'PATCH', { etag: snapshot.result.etag, stage: 'prd', content: prdContent, reviewed: true })).status, 200);
  assert.equal((await call(studioPath, 'PATCH', { etag: snapshot.result.etag, stage: 'prd', content: 'Sobrescrita concorrente inválida.', reviewed: true })).status, 409);
  let compiled = await call(studioPath + '?format=ignition');
  assert.equal(compiled.status, 200); assert.ok(compiled.result.includes(prdContent));
  snapshot = await call(studioPath);
  assert.equal((await call(studioPath, 'PATCH', { etag: snapshot.result.etag, stage: 'pss', content: 'Mapa sintético: atores, serviços e relações para teste.', reviewed: true })).status, 200);
  snapshot = await call(studioPath);
  await call(studioPath, 'PATCH', { etag: snapshot.result.etag, stage: 'prd', content: prdContent + ' Revisão posterior.', reviewed: true });
  snapshot = await call(studioPath);
  assert.equal(snapshot.result.states.pss, 'desatualizado');
  assert.equal((await call(studioPath + '?format=ignition')).status, 409);
  assert.equal((await call(studioPath, 'PATCH', { etag: snapshot.result.etag, stage: 'pss', content: 'Mapa sintético revisado após a mudança do PRD.', reviewed: true })).status, 200);
  assert.equal((await call(studioPath + '?format=ignition')).status, 200);
  assert.equal((await call('respond', 'POST', { token: a.token, action: 'open' }, false)).result.studio, undefined);
  assert.equal((await call('projects', 'POST', { project:'barraquinha' }, false)).status,401);
  const project = await call('projects', 'POST', { project:'barraquinha' });
  assert.ok([200,201].includes(project.status));
  if(project.result.created) owned.push({ id:project.result.id });
  const duplicateProject = await call('projects', 'POST', { project:'barraquinha' });
  assert.equal(duplicateProject.result.id,project.result.id); assert.equal(duplicateProject.result.created,false);
  const caseRecord = await call('records/'+project.result.id);
  assert.equal(caseRecord.result.record.evidenceType,'academic_case');
  if(project.result.created) {
    assert.match(caseRecord.result.record.studio.prd.content,/8 itens/);
    assert.equal(caseRecord.result.record.studio.prd.reviewed,false);
    await call('records/'+project.result.id,'PATCH',{etag:caseRecord.result.etag,notes:'Análise sintética editada para testar preservação.',nextStep:'Manter alterações ao reabrir caso.'});
    await call('projects','POST',{project:'barraquinha'});
    assert.equal((await call('records/'+project.result.id)).result.record.notes,'Análise sintética editada para testar preservação.');
    const beforeModel = await call('records/'+project.result.id);
    assert.equal((await call('projects','POST',{project:'barraquinha',action:'complete-test-model',etag:beforeModel.result.etag})).status,200);
    const modelStudio = await call('records/'+project.result.id+'/studio');
    assert.equal(Object.keys(modelStudio.result.studio).length,11);
    assert.ok(Object.values(modelStudio.result.states).every(s=>s==='revisado'));
    const completeModel = await call('records/'+project.result.id);
    assert.equal(Object.keys(completeModel.result.record.answers).length,13);
    assert.equal((await call('records/'+project.result.id+'/studio?format=ignition')).status,200);

  }
  const projectList = await call('invitations');
  assert.equal(projectList.result.records.find(r=>r.id===project.result.id).projectKey,'barraquinha');
  assert.equal((await call('health')).status, 200);
  console.log('PASS: estúdio privado, versionamento, concorrência e invalidação de documentos dependentes, compilação de ignição, cadastro direto, isolamento por token mesmo com e-mail repetido, exportação de prompts restrita, autenticação, origem, convites privados, consentimento, rascunho persistente, isolamento, envio único, leitura restrita, análise, concorrência, exportação, revogação, respostas abertas extensas e preservação do questionário anterior.');
} finally {
  for (const item of owned) {
    const detail = await call('records/' + item.id);
    if (detail.status === 200) await call('records/' + item.id, 'DELETE', { etag: detail.result.etag });
  }
  await call('session', 'POST', { logout: true });
}
