'use client';
import { useEffect, useState } from 'react';
import { questionsFor, answerLimitFor, STAGES, type Answers, type PublicInvite } from '@/lib/discovery/model';
import s from './Discovery.module.css';

type Invite = PublicInvite & { consented?: boolean };
async function request(payload: object, endpoint = 'respond') {
  const response = await fetch('/api/discovery/' + endpoint, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) });
  const result = await response.json();
  if (!response.ok) throw new Error(result.error || 'Não foi possível concluir.');
  return result;
}
function extractToken(value: string) {
  try { return new URL(value).hash.replace(/^#convite=/, ''); } catch { return value.replace(/^#convite=/, '').trim(); }
}
export default function DiscoveryForm() {
  const [token, setToken] = useState(''); const [entry, setEntry] = useState('');
  const [invite, setInvite] = useState<Invite | null>(null); const [answers, setAnswers] = useState<Answers>({});
  const [respondent, setRespondent] = useState(''); const [email, setEmail] = useState('');
  const [consent, setConsent] = useState(false); const [started, setStarted] = useState(false); const [step, setStep] = useState(0);
  const [busy, setBusy] = useState(false); const [error, setError] = useState(''); const [receipt, setReceipt] = useState(''); const [saved, setSaved] = useState('');
  const questions = questionsFor(invite?.questionnaireVersion);
  const answerLimit = answerLimitFor(invite?.questionnaireVersion);
  async function openInvite(value: string) {
    const code = extractToken(value); setBusy(true); setError('');
    try {
      const data = await request({ token: code, action: 'open' });
      setToken(code); sessionStorage.setItem('wise-discovery-invite', code);
      if (data.completed) { setReceipt(data.receipt); sessionStorage.removeItem('wise-discovery-invite'); return; }
      setInvite(data); setAnswers(data.answers || {}); setRespondent(data.respondent || ''); setEmail(data.email || ''); setConsent(!!data.consented);
    } catch (e) { setError((e as Error).message); } finally { setBusy(false); }
  }
  useEffect(() => {
    const fragment = window.location.hash;
    const value = fragment.startsWith('#convite=') ? fragment.slice(9) : sessionStorage.getItem('wise-discovery-invite');
    if (fragment.startsWith('#convite=')) window.history.replaceState({}, '', '/discovery');
    if (!value) return;
    // Restore the browser-only capability after mounting; cancel on StrictMode cleanup.
    const restore = window.setTimeout(() => { void openInvite(value); }, 0);
    return () => window.clearTimeout(restore);
  }, []);
  async function register() {
    setBusy(true); setError('');
    try {
      const data = await request({ name: respondent, email, consent }, 'register');
      setToken(data.token); sessionStorage.setItem('wise-discovery-invite', data.token);
      setInvite(data.invite); setAnswers({}); setStarted(true); setStep(0);
    } catch (e) { setError((e as Error).message); } finally { setBusy(false); }
  }
  async function save(final = false) {
    setError('');
    const missing = questions.filter(q => q.required && (final || q.group === step) && (answers[q.id] || '').trim().length < 10);
    if (missing.length) { setError(`Conte um pouco mais em “${missing[0].title}” (pelo menos 10 caracteres).`); document.getElementById(missing[0].id)?.focus(); return; }
    if (!consent) { setError('Confirme sua participação antes de continuar.'); return; }
    setBusy(true);
    try {
      const result = await request({ token, action: final ? 'submit' : 'draft', answers, respondent, email, consent });
      if (result.completed) { setReceipt(result.receipt); sessionStorage.removeItem('wise-discovery-invite'); }
      else { setSaved('Rascunho salvo às ' + new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })); setStep(current => Math.min(3, current + 1)); window.scrollTo({ top: 0, behavior: 'smooth' }); }
    } catch (e) { setError((e as Error).message); } finally { setBusy(false); }
  }
  if (receipt) return <main className={s.completion}><span className={s.successIcon}>✓</span><p className={s.eyebrow}>CONVERSA REGISTRADA</p><h1>Obrigado por compartilhar<br />seu jeito de fazer.</h1><p>Suas respostas vão ajudar a entender o problema antes de desenhar uma solução. A Wise fará a leitura e combinará os próximos passos com você.</p><div className={s.receipt}>Protocolo <strong>{receipt}</strong></div><p className={s.subtle}>Não há contratação ou compromisso de compra. Se precisar corrigir uma resposta ou solicitar exclusão, entre em contato.</p><a className={s.button} href="mailto:contato@wiseticonsulting.com.br">Falar com a Wise ↗</a></main>;
  return <main className={s.main}>
    <aside className={s.intro}>
      <p className={s.eyebrow}>WISE DISCOVERY / PRIMEIRO, ESCUTAR</p>
      <h1>Seu negócio primeiro.<br /><em>A tecnologia depois.</em></h1>
      <p className={s.introText}>Antes de criar uma solução, queremos entender como o trabalho acontece de verdade. Uma conversa sobre o que funciona, o que pesa e o que poderia melhorar.</p>
      <div className={s.introMeta}><span>Conversa aberta</span><span>Sem compromisso</span><span>No seu ritmo</span></div>
      <div className={s.callout}><strong>Projeto de referência: Barraquinha Digital</strong><p>Caso acadêmico com documentos e prompts para revisão no espaço do pesquisador.</p><a href="/barraquinha">Experimentar o cardápio no celular ↗</a><br/><a href="/discovery/admin">Acessar o projeto no Admin ↗</a></div>
      <div className={s.principle}><span>01 — OUVIR PARA CONSTRUIR</span><p>Não procuramos respostas perfeitas.<br />Procuramos situações reais.</p></div>
      {invite && started && <nav className={s.steps} aria-label="Etapas do questionário">{STAGES.map((label, index) => <div className={`${s.step} ${index === step ? s.stepActive : ''}`} key={label} aria-current={index === step ? 'step' : undefined}><span>{index < step ? '✓' : String(index + 1).padStart(2, '0')}</span>{label}</div>)}</nav>}
    </aside>
    <section className={s.formPanel} aria-live="polite">
      {error && <div className={s.error} role="alert">{error}</div>}
      {!invite ? <>
        <div className={s.panelTop}><span className={s.miniLabel}>UM ESPAÇO PARA O SEU NEGÓCIO</span><span className={s.lineIcon}>↗</span></div>
        <h2>Vamos conhecer<br />seu negócio?</h2><p className={s.subtle}>Informe seu nome e e-mail para começar. Você já poderá contar sua história e as dificuldades do seu negócio.</p>
        <form onSubmit={e => { e.preventDefault(); void register(); }} className={s.inviteEntry}>
          <label htmlFor="signup-name">Seu nome</label><input id="signup-name" autoComplete="name" minLength={2} maxLength={120} value={respondent} onChange={e => setRespondent(e.target.value)} required />
          <label htmlFor="signup-email">Seu e-mail</label><input id="signup-email" type="email" autoComplete="email" maxLength={254} value={email} onChange={e => setEmail(e.target.value)} required />
          <label className={s.checkbox}><input type="checkbox" checked={consent} onChange={e => setConsent(e.target.checked)} required /><span>Quero participar voluntariamente e autorizo o uso destas respostas para pesquisa e acompanhamento pela Wise. Li as <a href="/discovery/privacidade" target="_blank" rel="noreferrer">informações de privacidade</a>.</span></label>
          <button className={s.button} disabled={busy || !consent}>{busy ? 'Preparando seu espaço…' : 'Começar meu questionário →'}</button>
        </form>
        <details className={s.callout}><summary>Já tenho um convite ou link para continuar</summary><form onSubmit={e => { e.preventDefault(); void openInvite(entry); }} className={s.inviteEntry}><label htmlFor="invite-link">Link ou código privado</label><input id="invite-link" value={entry} onChange={e => setEntry(e.target.value)} required /><button className={s.secondaryButton} disabled={busy}>Continuar minha conversa →</button></form></details>
        <a className={s.privacyLink} href="/discovery/privacidade">Como cuidamos das suas informações</a>
      </> : !started ? <>
        <span className={s.miniLabel}>SEU ESPAÇO DE DISCOVERY</span><h2>Olá,<br />{invite.company}.</h2><span className={s.segmentTag}>{invite.segment}</span>
        <p>Queremos conhecer seu negócio como ele é: sua história, a rotina, as dificuldades e os desejos. Você tem espaço para contar o que considerar importante, sem precisar propor uma solução.</p>
        <ul className={s.welcomeList}><li>Use exemplos reais, sem nomes ou dados de clientes.</li><li>Se não souber uma resposta, pode dizer isso.</li><li>Você pode salvar entre as etapas e voltar pelo mesmo convite.</li></ul>
        <label className={s.checkbox}><input type="checkbox" checked={consent} onChange={e => setConsent(e.target.checked)} /><span>Quero participar voluntariamente e autorizo a WiseTIConsulting a usar estas respostas para a pesquisa e seu acompanhamento. Li as <a href="/discovery/privacidade" target="_blank" rel="noreferrer">informações de privacidade</a>.</span></label>
        <button className={s.button} disabled={!consent || busy} onClick={() => { setStarted(true); setError(''); }}>{invite.status === 'draft' ? 'Continuar meu rascunho →' : 'Começar minha conversa →'}</button>
        <p className={s.finePrint}>Este convite é individual. Não compartilhe o link com outras empresas.</p>
      </> : <>
        <div className={s.panelTop}><span className={s.miniLabel}>{invite.company}</span><span className={s.counter}>ETAPA {step + 1} DE 4</span></div>
        <details className={s.callout}><summary>Guardar meu link privado para continuar depois</summary><p>Este link permite acessar seu rascunho. Guarde com cuidado e não compartilhe. O e-mail informado não é um login verificado.</p><button type="button" className={s.secondaryButton} onClick={async () => { try { await navigator.clipboard.writeText(window.location.origin + '/discovery#convite=' + token); setSaved('Link privado copiado.'); } catch { setError('Não foi possível copiar. Tente novamente neste navegador.'); } }}>Copiar meu link privado</button></details>
        <div className={s.progress} aria-label={`Etapa ${step + 1} de 4`}><span style={{ width: `${(step + 1) * 25}%` }} /></div>
        <h2 className={s.stepTitle}>{STAGES[step]}</h2><p className={s.subtle}>Use as perguntas como ponto de partida e conte com suas palavras. Há espaço livre para complementar. Apenas os campos com * são essenciais.</p>
        <form onSubmit={e => { e.preventDefault(); void save(step === 3); }}>
          {questions.filter(q => q.group === step).map(q => <div className={s.question} key={q.id}><label htmlFor={q.id}><span className={s.questionId}>{String(questions.findIndex(item => item.id === q.id) + 1).padStart(2, '0')}</span>{q.title}{q.required ? ' *' : ''}</label><p id={`${q.id}-hint`} className={s.hint}>{q.hint}</p><textarea id={q.id} aria-describedby={`${q.id}-hint`} rows={q.id === 'P13' || q.id === 'P03' || q.id === 'P01' ? 7 : 5} maxLength={answerLimit} aria-required={q.required} value={answers[q.id] || ''} onChange={e => { setAnswers(current => ({ ...current, [q.id]: e.target.value })); setSaved('Há respostas ainda não salvas.'); }} placeholder="Conte com suas palavras, com o nível de detalhe que fizer sentido para você…" /><span className={s.charCount}>{(answers[q.id] || '').length.toLocaleString('pt-BR')}/{answerLimit.toLocaleString('pt-BR')} caracteres</span></div>)}
          {step === 3 && <div className={s.contactFields}><p className={s.miniLabel}>COMO PODEMOS RETOMAR A CONVERSA? (OPCIONAL)</p><label htmlFor="respondent">Seu nome e função</label><input id="respondent" value={respondent} maxLength={120} onChange={e => setRespondent(e.target.value)} autoComplete="name" /><label htmlFor="email">E-mail para contato</label><input id="email" type="email" maxLength={254} value={email} onChange={e => setEmail(e.target.value)} autoComplete="email" /></div>}
          <div className={s.formActions}>{step > 0 && <button className={s.secondaryButton} type="button" disabled={busy} onClick={() => { setStep(step - 1); setError(''); }}>← Voltar</button>}<button className={s.button} disabled={busy}>{busy ? 'Salvando…' : step === 3 ? 'Concluir e enviar respostas ↗' : 'Salvar e continuar →'}</button></div>
          <p className={s.saveStatus} role="status">{saved || 'As respostas são salvas quando você avança de etapa.'}</p>
        </form>
      </>}
    </section>
  </main>;
}
