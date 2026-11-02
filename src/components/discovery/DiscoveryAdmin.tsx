'use client';
import DiscoveryStudio from './DiscoveryStudio';
import { useEffect, useState } from 'react';
import { questionsFor, SEGMENTS, type DiscoveryRecord } from '@/lib/discovery/model';
import s from './Discovery.module.css';
type Summary = Pick<DiscoveryRecord, 'id' | 'company' | 'segment' | 'status' | 'createdAt' | 'submittedAt' | 'evidenceType' | 'projectKey'>;
const LABELS = { invited: 'Convite criado', draft: 'Em andamento', submitted: 'Recebida', reviewed: 'Analisada', revoked: 'Encerrada' };
async function api(path: string, options?: RequestInit) {
  const response = await fetch('/api/discovery/' + path, { ...options, headers: { 'Content-Type': 'application/json', ...options?.headers } });
  const result = await response.json();
  if (!response.ok) throw new Error(result.error || 'Não foi possível concluir.');
  return result;
}
export default function DiscoveryAdmin() {
  const [authorized, setAuthorized] = useState(false); const [loading, setLoading] = useState(true); const [busy, setBusy] = useState(false);
  const [key, setKey] = useState(''); const [error, setError] = useState(''); const [notice, setNotice] = useState('');
  const [records, setRecords] = useState<Summary[]>([]); const [search, setSearch] = useState(''); const [filter, setFilter] = useState('all');
  const [company, setCompany] = useState(''); const [segment, setSegment] = useState(SEGMENTS[0]); const [inviteUrl, setInviteUrl] = useState(''); const [showCreate, setShowCreate] = useState(false);
  const [selected, setSelected] = useState<DiscoveryRecord | null>(null); const [etag, setEtag] = useState(''); const [notes, setNotes] = useState(''); const [nextStep, setNextStep] = useState('');
  async function load() {
    const data = await api('invitations'); setRecords(data.records);
    if (data.truncated) setNotice('Exibindo até 200 registros. Exporte e organize a pesquisa antes de ampliar a coleta.');
  }
  useEffect(() => { void api('session').then(async data => { setAuthorized(data.authenticated); if (data.authenticated) await load(); }).catch(e => setError(e.message)).finally(() => setLoading(false)); }, []);
  async function login(event: React.FormEvent) {
    event.preventDefault(); setBusy(true); setError('');
    try { await api('session', { method: 'POST', body: JSON.stringify({ key }) }); setKey(''); setAuthorized(true); await load(); }
    catch (e) { setError((e as Error).message); } finally { setBusy(false); }
  }
  async function open(id: string) {
    setBusy(true); setError('');
    try { const data = await api('records/' + id); setSelected(data.record); setEtag(data.etag); setNotes(data.record.notes); setNextStep(data.record.nextStep); }
    catch (e) { setError((e as Error).message); } finally { setBusy(false); }
  }
  async function openBeach() {
    setBusy(true); setError('');
    try { const data = await api('projects', { method:'POST', body:JSON.stringify({project:'barraquinha'}) }); await load(); await open(data.id); setNotice('Barraquinha Digital: caso acadêmico com documentos iniciais no Estúdio de Produto.'); }
    catch(e) { setError((e as Error).message); } finally { setBusy(false); }
  }
  async function create(event: React.FormEvent) {
    event.preventDefault(); setBusy(true); setError(''); setInviteUrl('');
    try { const data = await api('invitations', { method: 'POST', body: JSON.stringify({ company, segment }) }); setInviteUrl(data.url); setCompany(''); await load(); }
    catch (e) { setError((e as Error).message); } finally { setBusy(false); }
  }
  async function change(action: 'save' | 'revoke' | 'delete') {
    if (!selected) return;
    if (action !== 'save' && !window.confirm(action === 'delete' ? 'Excluir esta entrevista e suas respostas da pesquisa?' : 'Encerrar este convite? O participante não poderá mais acessá-lo.')) return;
    setBusy(true); setError('');
    try {
      await api('records/' + selected.id, { method: action === 'delete' ? 'DELETE' : 'PATCH', body: JSON.stringify({ action, etag, notes, nextStep }) });
      setNotice(action === 'save' ? 'Análise registrada. O relato do participante foi preservado.' : action === 'delete' ? 'Registro excluído.' : 'Convite encerrado.');
      if (action === 'save') await open(selected.id); else setSelected(null);
      await load();
    } catch (e) { setError((e as Error).message); } finally { setBusy(false); }
  }
  if (loading) return <main className={s.loading}>Preparando seu espaço…</main>;
  if (!authorized) return <main className={s.loginLayout}><div><p className={s.eyebrow}>ESPAÇO DO PESQUISADOR</p><h1>Boas perguntas.<br /><em>Decisões melhores.</em></h1><p className={s.introText}>Crie convites, acompanhe as conversas e transforme relatos em aprendizados para a primeira oferta da Wise.</p></div><form className={s.formPanel} onSubmit={login}><span className={s.miniLabel}>ACESSO RESTRITO</span><h2>Seu ponto<br />de partida.</h2>{error && <p className={s.error} role="alert">{error}</p>}<label htmlFor="admin-key">Código de acesso do pesquisador</label><input id="admin-key" type="password" autoComplete="current-password" required value={key} onChange={e => setKey(e.target.value)} /><button className={s.button} disabled={busy}>{busy ? 'Entrando…' : 'Entrar no acompanhamento →'}</button><p className={s.finePrint}>Participantes acessam a pesquisa pelo convite individual, sem este código.</p></form></main>;
  const received = records.filter(r => r.evidenceType !== 'academic_case' && ['submitted', 'reviewed'].includes(r.status)).length;
  const visible = records.filter(r => (filter === 'all' || r.status === filter) && `${r.company} ${r.segment}`.toLowerCase().includes(search.toLowerCase()));
  return <main className={s.dashboard}>
    <div className={s.dashboardHeading}><div><p className={s.eyebrow}>DISCOVERY / VISÃO DO PESQUISADOR</p><h1>Escutar. Entender.<br /><em>Encontrar o próximo passo.</em></h1></div><div className={s.headingActions}><button className={s.secondaryButton} onClick={async () => { await api('session', { method: 'POST', body: JSON.stringify({ logout: true }) }); setAuthorized(false); setSelected(null); setRecords([]); setInviteUrl(''); }}>Sair</button><button className={s.button} onClick={() => { setShowCreate(!showCreate); setInviteUrl(''); }}>+ Novo convite</button></div></div>
    {error && <p className={s.error} role="alert">{error}</p>}{notice && <p className={s.notice} role="status">{notice}</p>}
    <section className={s.callout}><strong>Projeto acadêmico · Barraquinha Digital</strong><p>Abra o caso com Business Case, PRD, PSS, Blueprint, requisitos e plano de dados/ML. Modelo acadêmico para testar o fluxo e a aplicação Azure.</p><button className={s.button} disabled={busy} onClick={() => void openBeach()}>Abrir projeto Barraquinha Digital →</button><div className={s.formActions}><a className={s.secondaryButton} href="/barraquinha" target="_blank" rel="noreferrer">Cliente no celular ↗</a><a className={s.secondaryButton} href="/barraquinha/operacao" target="_blank" rel="noreferrer">Painel / totem da barraca ↗</a></div></section>
    <div className={s.metrics}><div><span>REGISTROS E PROJETOS</span><strong>{records.length.toString().padStart(2, '0')}</strong></div><div><span>CONVERSAS RECEBIDAS</span><strong>{received.toString().padStart(2, '0')}</strong></div><div><span>ANÁLISES REGISTRADAS</span><strong>{records.filter(r => r.evidenceType !== 'academic_case' && r.status === 'reviewed').length.toString().padStart(2, '0')}</strong></div><p>Um relato é um ponto de partida.<br />Compare exemplos antes de concluir.</p></div>
    {showCreate && <section className={s.createPanel}><div><p className={s.miniLabel}>UMA CONVERSA POR VEZ</p><h2>Convide uma empresa.</h2><p>O link vale por 30 dias. Compartilhe diretamente com a pessoa que vai participar.</p></div><form onSubmit={create}><label htmlFor="company">Empresa ou identificação da entrevista</label><input id="company" required minLength={2} maxLength={160} value={company} onChange={e => setCompany(e.target.value)} placeholder="Ex.: Entrevista 01 · Adega" /><label htmlFor="segment">Segmento</label><select id="segment" value={segment} onChange={e => setSegment(e.target.value)}>{SEGMENTS.map(item => <option key={item}>{item}</option>)}</select><button className={s.button} disabled={busy}>{busy ? 'Criando…' : 'Criar link individual →'}</button></form>{inviteUrl && <div className={s.newInvite}><strong>Convite pronto para compartilhar</strong><p>Copie agora: por segurança, este link não será exibido novamente. Se perdê-lo, encerre o convite e crie outro.</p><input aria-label="Link do convite criado" readOnly value={inviteUrl} onFocus={e => e.target.select()} /><button className={s.secondaryButton} onClick={async () => { try { await navigator.clipboard.writeText(inviteUrl); setNotice('Link copiado.'); } catch { setNotice('Selecione e copie o link acima.'); } }}>Copiar link</button><a href={inviteUrl} target="_blank" rel="noreferrer">Abrir convite ↗</a></div>}</section>}
    <div className={s.workspace}><section className={s.listPanel}><div className={s.listHeading}><h2>Conversas e projetos</h2><button className={s.textButton} onClick={() => { void load().catch(e => setError(e.message)); }}>Atualizar ↻</button></div><div className={s.filters}><input aria-label="Buscar empresa ou segmento" placeholder="Buscar empresa ou segmento" value={search} onChange={e => setSearch(e.target.value)} /><select aria-label="Filtrar status" value={filter} onChange={e => setFilter(e.target.value)}><option value="all">Todos os status</option>{Object.entries(LABELS).map(([value, label]) => <option value={value} key={value}>{label}</option>)}</select></div>
      {visible.length ? <div className={s.recordList}>{visible.map(record => <button className={`${s.recordRow} ${selected?.id === record.id ? s.recordSelected : ''}`} key={record.id} onClick={() => void open(record.id)}><span className={s.recordMonogram}>{record.company.slice(0, 1).toUpperCase()}</span><span className={s.recordName}><strong>{record.company}</strong><small>{record.evidenceType === 'academic_case' ? 'Caso acadêmico' : record.segment} · {new Date(record.createdAt).toLocaleDateString('pt-BR')}</small></span><span className={`${s.badge} ${['submitted', 'reviewed'].includes(record.status) ? s.badgeReceived : ''}`}>{LABELS[record.status]}</span><span>↗</span></button>)}</div> : <div className={s.emptyState}><span>↗</span><h3>{records.length ? 'Nenhuma conversa neste filtro.' : 'A primeira conversa começa com um convite.'}</h3><p>{records.length ? 'Tente outra busca ou status.' : 'Escolha alguém da sua rede, crie um link e ouça um caso real do negócio.'}</p></div>}
    </section>
    {selected ? <section className={s.detailPanel}><div className={s.panelTop}><span className={s.miniLabel}>{selected.evidenceType === 'academic_case' ? 'PROJETO ACADÊMICO' : 'RELATO DO PARTICIPANTE'}</span><button className={s.textButton} onClick={() => setSelected(null)}>Fechar ×</button></div><h2>{selected.company}</h2><span className={s.segmentTag}>{selected.segment} · {LABELS[selected.status]}</span>{selected.respondent && <p>{selected.respondent}{selected.email ? ` · ${selected.email}` : ''}</p>}<p className={s.finePrint}>{selected.evidenceType === 'academic_case' ? 'Caso acadêmico · Documentos iniciais' : 'Autorrelato'} · Questionário {selected.questionnaireVersion}{selected.evidenceType === 'academic_case' ? ' · Revisão de documentos pendente' : selected.submittedAt ? ` · Enviado em ${new Date(selected.submittedAt).toLocaleString('pt-BR')}` : ' · Ainda não enviado'}</p>
      <a className={s.exportLink} href={`/api/discovery/records/${selected.id}?format=markdown`}>↓ Exportar entrevista em Markdown</a>
      <a className={s.exportLink} href={`/api/discovery/records/${selected.id}?format=pipeline`}>↓ Preparar prompts: business case até implantação</a>
      <p className={s.finePrint}>Chat com IA: aguardando configuração do modelo. Os prompts são um roteiro de trabalho; nenhum código ou recurso de nuvem é executado automaticamente.</p>
      {(selected.evidenceType !== 'academic_case' || Object.keys(selected.answers).length > 0) && <div className={s.answerList}>{questionsFor(selected.questionnaireVersion).map(q => <div key={q.id}><h3><span>{q.id}</span> {q.title}</h3><p>{selected.answers[q.id] || 'Ainda não informado.'}</p></div>)}</div>}
      <DiscoveryStudio key={selected.id} id={selected.id} onSaved={() => open(selected.id)} />
      <div className={s.analysis}><p className={s.miniLabel}>SUA ANÁLISE · SEPARADA DO RELATO</p><label htmlFor="notes">Evidências, hipóteses e contradições</label><textarea id="notes" rows={5} maxLength={8000} value={notes} onChange={e => setNotes(e.target.value)} placeholder="O que foi relatado? O que ainda precisa ser verificado?" /><label htmlFor="next-step">Próximo passo proposto</label><textarea id="next-step" rows={3} maxLength={2000} value={nextStep} onChange={e => setNextStep(e.target.value)} placeholder="Ex.: observar o processo de agendamento com o responsável." /><button className={s.button} disabled={busy} onClick={() => void change('save')}>Salvar análise →</button></div><div className={s.dangerActions}><button disabled={busy || selected.status === 'revoked'} onClick={() => void change('revoke')}>Encerrar convite</button><button disabled={busy} onClick={() => void change('delete')}>Excluir registro</button></div>
    </section> : <aside className={s.researchTip}><p className={s.miniLabel}>UM BOM DISCOVERY</p><h2>O último caso real vale mais que uma ideia perfeita.</h2><p>Procure frequência, impacto, alternativas e limites. Uma resposta isolada não valida um produto — ela ajuda a escolher a próxima pergunta.</p><span>OUVIR → COMPARAR → TESTAR</span></aside>}
    </div>
  </main>;
}
