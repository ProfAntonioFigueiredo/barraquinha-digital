'use client';
import { useState } from 'react';
import type { ArtifactId, Studio } from '@/lib/discovery/studio';
import s from './Discovery.module.css';
// Keep the browser module independent of the server-only hashing/compiler implementation.
const STAGES = [ ['business','Business Case'], ['prd','PRD'], ['pss','PSS — Mapa de Produtos e Serviços'], ['blueprint','Service Blueprint'], ['requirements','Requisitos e contratos'], ['kernel','Kernel de dados'], ['design','Design System'], ['architecture','Arquitetura e BoM multicloud'], ['ml','Dados, ML e personalização'], ['validation','Validação'], ['deployment','Implantação'] ] as const;
export default function DiscoveryStudio({ id, onSaved }: { id: string; onSaved: () => Promise<void> }) {
  const [loaded,setLoaded] = useState(false), [busy,setBusy] = useState(false), [error,setError] = useState(''), [notice,setNotice] = useState('');
  const [studio,setStudio] = useState<Studio>({}), [states,setStates] = useState<Record<string,string>>({}), [etag,setEtag] = useState('');
  const [stage,setStage] = useState<ArtifactId>('business'), [content,setContent] = useState(''), [reviewed,setReviewed] = useState(false);
  const path = '/api/discovery/records/' + id + '/studio';
  async function load() {
    setBusy(true); setError('');
    try { const r = await fetch(path); const data = await r.json(); if (!r.ok) throw new Error(data.error);
      setStudio(data.studio); setStates(data.states); setEtag(data.etag); setContent(data.studio[stage]?.content ?? ''); setReviewed(data.states[stage] === 'revisado'); setLoaded(true);
    } catch(e) { setError((e as Error).message); } finally { setBusy(false); }
  }
  async function save() {
    setBusy(true); setError(''); setNotice('');
    try { const r = await fetch(path, { method:'PATCH', headers:{'Content-Type':'application/json'}, body:JSON.stringify({etag,stage,content,reviewed}) });
      const data = await r.json(); if (!r.ok) throw new Error(data.error);
      await load(); await onSaved(); setNotice('Documento salvo. Revise as etapas dependentes se os dados mudaram.');
    } catch(e) { setError((e as Error).message); } finally { setBusy(false); }
  }
  async function download(format: 'prompt'|'ignition') {
    setBusy(true); setError('');
    try { const r = await fetch(path+'?format='+format+'&stage='+stage);
      if(!r.ok) throw new Error((await r.json()).error);
      const url = URL.createObjectURL(await r.blob()), a = document.createElement('a'); a.href=url; a.download='wise-'+format+'-'+stage+'.md'; a.click(); setTimeout(()=>URL.revokeObjectURL(url),1000);
    } catch(e) { setError((e as Error).message); } finally { setBusy(false); }
  }
  return <section className={s.analysis}><p className={s.miniLabel}>ESTÚDIO DE PRODUTO / VIBE CODING</p><h2>Do relato à construção.</h2><p>Prepare os prompts, execute no Codex e registre os documentos resultantes aqui. O portal não chama IA nem executa código ou implantação automaticamente.</p>
    {error && <p className={s.error} role="alert">{error}</p>}{notice && <p className={s.notice} role="status">{notice}</p>}
    <button className={s.secondaryButton} disabled={busy} onClick={() => void load()}>{loaded ? 'Recarregar documentos salvos' : 'Abrir documentos e prompts →'}</button>
    {loaded && <><label htmlFor={'stage-'+id}>Etapa</label><select id={'stage-'+id} value={stage} disabled={busy} onChange={e => { if(content !== (studio[stage]?.content ?? '') && !window.confirm('Trocar de etapa e descartar alterações não salvas?')) return; const next = e.target.value as ArtifactId; setStage(next); setContent(studio[next]?.content ?? ''); setReviewed(states[next] === 'revisado'); setNotice(''); }}>{STAGES.map(([key,title]) => <option value={key} key={key}>{title} · {states[key] ?? 'ausente'}</option>)}</select>
    <p className={s.finePrint}>Versão {studio[stage]?.version ?? 0} · {states[stage] ?? 'ausente'}. Salve antes de exportar. As versões identificam a revisão atual; versões anteriores ainda não ficam arquivadas.</p>
    <button className={s.secondaryButton} disabled={busy} onClick={() => void download('prompt')}>↓ Baixar prompt desta etapa</button>
    <label htmlFor={'artifact-'+id}>Documento resultante (Markdown)</label><textarea id={'artifact-'+id} rows={15} maxLength={12000} value={content} onChange={e=>{ setContent(e.target.value); setReviewed(false); }} placeholder="Execute o prompt na ferramenta autorizada, revise e cole o documento aqui. Não inclua senhas ou chaves." />
    <label className={s.checkbox}><input type="checkbox" checked={reviewed} onChange={e=>setReviewed(e.target.checked)} /><span>Revisei este documento e suas fontes atuais. Isto não comprova testes ou implantação.</span></label>
    <button className={s.button} disabled={busy || content.trim().length < 10} onClick={()=>void save()}>Salvar documento →</button>
    <button className={s.secondaryButton} disabled={busy} onClick={()=>void download('ignition')}>↓ Compilar Prompt de Ignição</button><p className={s.finePrint}>Requer ao menos PRD, PSS ou Blueprint. Todos os documentos presentes precisam estar revisados e atuais. A compilação reúne os textos; conflitos semânticos precisam ser conferidos na ferramenta de IA.</p></>}
  </section>;
}
