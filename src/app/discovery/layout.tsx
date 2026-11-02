import type { Metadata } from 'next';
import styles from '@/components/discovery/Discovery.module.css';
export const metadata: Metadata = { title: 'Discovery — WiseTIConsulting', description: 'Uma conversa sobre seu negócio para descobrir o que vale a pena melhorar.', robots: { index: false, follow: false }, referrer: 'no-referrer' };
export default function DiscoveryLayout({ children }: { children: React.ReactNode }) {
  return <div className={styles.portal}><header className={styles.header}><a className={styles.brand} href="/discovery" aria-label="WiseTIConsulting Discovery"><span className={styles.logo}>W<span>·</span></span><span>wise<span className={styles.brandLight}>ticonsulting</span><small>TECNOLOGIA COM PROPÓSITO</small></span></a><span className={styles.portalLabel}>Discovery de negócios <span className={styles.dot} /></span></header>{children}<footer className={styles.footer}><span>WiseTIConsulting · Da escuta à solução.</span><a href="mailto:contato@wiseticonsulting.com.br">Fale com a Wise</a><a href="/discovery/admin">Área de acompanhamento ↗</a></footer></div>;
}
