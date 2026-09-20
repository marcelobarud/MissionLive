import { useEffect, useRef, useState, type ReactNode } from 'react';
import { Link } from 'react-router-dom';
import { IconArrowUpRight, IconBell, IconCheck, IconChecklist, IconMenu2, IconPlayerPause, IconPlayerPlay, IconTargetArrow, IconUsersGroup, IconX } from '@tabler/icons-react';
import { WebThreads } from './web-threads';

type Plan = {
  name: string;
  price: string;
  description: string;
  features: string[];
  cta: string;
  href?: string;
  disabled?: boolean;
  featured?: boolean;
};

const plans: Plan[] = [
  {
    name: 'Free',
    price: 'R$ 0',
    description: 'Para começar a organizar o que importa, no seu ritmo.',
    features: ['Metas individuais', 'Passos e progresso visível', 'Acesso ao app'],
    cta: 'Começar grátis',
    href: '/register',
  },
  {
    name: 'Pro',
    price: 'R$ 15,90 / mês',
    description: 'Uma visão mais completa para planos que crescem com você.',
    features: ['Tudo do plano Free', 'Metas compartilhadas e de equipe', 'Lembretes e acompanhamento'],
    cta: 'Em breve',
    disabled: true,
    featured: true,
  },
];

function LandingLogo({ loading = 'eager', fetchPriority = 'auto' }: { loading?: 'eager' | 'lazy'; fetchPriority?: 'high' | 'low' | 'auto' }) {
  return <img className="landing-logo" src="/brand/missionlive-logo-dark.svg" alt="MissionLive" width="190" height="45" decoding="async" loading={loading} fetchPriority={fetchPriority} />;
}

function LandingButton({ children, href, variant = 'primary', disabled = false }: { children: ReactNode; href: string; variant?: 'primary' | 'secondary'; disabled?: boolean }) {
  return <Link className={`landing-button landing-button-${variant}${disabled ? ' is-disabled' : ''}`} to={href} aria-disabled={disabled || undefined} tabIndex={disabled ? -1 : undefined}>{children}</Link>;
}

function LandingGoalPreview() {
  return <article className="landing-goal-preview" aria-label="Exemplo de uma meta em andamento">
    <div className="landing-preview-topline"><span>Prévia do aplicativo</span><span className="landing-preview-demo">Dados de demonstração</span></div>
    <div className="landing-preview-title"><div><span className="landing-preview-label">META INDIVIDUAL</span><h2>Voltar a correr</h2></div><strong>72%</strong></div>
    <div className="landing-progress-track" aria-hidden="true"><span /></div>
    <div className="landing-preview-meta"><span>3 de 4 passos</span><span>Até 30 set.</span></div>
    <ul className="landing-preview-steps">
      <li className="is-complete"><IconCheck size={16} stroke={2.3} aria-hidden="true" /><span>Escolher os dias</span></li>
      <li className="is-complete"><IconCheck size={16} stroke={2.3} aria-hidden="true" /><span>Separar o equipamento</span></li>
      <li className="is-complete"><IconCheck size={16} stroke={2.3} aria-hidden="true" /><span>Fazer o primeiro treino</span></li>
      <li><span className="landing-step-dot" aria-hidden="true" /><span>Manter o ritmo</span></li>
    </ul>
    <Link className="landing-preview-link" to="/login">Ver no aplicativo <IconArrowUpRight size={16} stroke={1.9} aria-hidden="true" /></Link>
  </article>;
}

function LandingFeature({ icon, title, children }: { icon: ReactNode; title: string; children: ReactNode }) {
  return <article className="landing-feature"><div className="landing-feature-icon" aria-hidden="true">{icon}</div><div><h3>{title}</h3><p>{children}</p></div></article>;
}

function LandingStep({ index, title, children }: { index: string; title: string; children: ReactNode }) {
  return <article className="landing-step"><span className="landing-step-number" aria-hidden="true">{index}</span><div><h3>{title}</h3><p>{children}</p></div></article>;
}

function LandingProductPreview() {
  return <div className="landing-product-preview" aria-label="Prévia ilustrativa do aplicativo MissionLive. Dados de demonstração.">
    <div className="landing-product-sidebar"><span className="landing-product-mark">M</span><span className="landing-product-line is-active" /><span className="landing-product-line" /><span className="landing-product-line" /><span className="landing-product-line" /></div>
    <div className="landing-product-content">
      <div className="landing-product-heading"><div><span className="landing-preview-label">INÍCIO</span><h3>O que está em movimento</h3></div><span className="landing-product-avatar">A</span></div>
      <div className="landing-product-next"><div><span className="landing-preview-label">PRÓXIMO PASSO</span><strong>Revisar a proposta do projeto</strong><small>Meta de equipe · 2 de 5 passos</small></div><span className="landing-product-percent">40%</span></div>
      <div className="landing-product-grid"><div><span className="landing-preview-label">METAS ABERTAS</span><strong>04</strong></div><div><span className="landing-preview-label">CONCLUÍDAS</span><strong>08</strong></div><div><span className="landing-preview-label">PROGRESSO ATIVO</span><strong>64%</strong></div></div>
      <div className="landing-product-list"><div><span className="landing-product-list-dot" /><span>Planejar a semana</span><strong>80%</strong></div><div><span className="landing-product-list-dot" /><span>Preparar a apresentação</span><strong>55%</strong></div><div><span className="landing-product-list-dot" /><span>Organizar viagem</span><strong>25%</strong></div></div>
    </div>
  </div>;
}

export function LandingPage() {
  const [menuOpen, setMenuOpen] = useState(false);
  const [motionPaused, setMotionPaused] = useState(false);
  const menuButtonRef = useRef<HTMLButtonElement>(null);
  const closeMenu = () => setMenuOpen(false);

  useEffect(() => {
    if (!menuOpen) return undefined;
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setMenuOpen(false);
        menuButtonRef.current?.focus();
      }
    };
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.body.style.overflow = previousOverflow;
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [menuOpen]);

  return <div className="landing-page">
    <a className="landing-skip-link" href="#landing-content">Pular para o conteúdo</a>
    <header className="landing-header">
      <div className="landing-header-inner">
        <Link className="landing-brand" to="/" onClick={closeMenu}><LandingLogo fetchPriority="high" /></Link>
        <button ref={menuButtonRef} className="landing-menu-button" type="button" aria-label={menuOpen ? 'Fechar menu' : 'Abrir menu'} aria-controls="public-navigation" aria-expanded={menuOpen} onClick={() => setMenuOpen((open) => !open)}>{menuOpen ? <IconX size={22} stroke={1.9} aria-hidden="true" /> : <IconMenu2 size={22} stroke={1.9} aria-hidden="true" />}</button>
        <nav id="public-navigation" className={`landing-nav${menuOpen ? ' is-open' : ''}`} aria-label="Navegação pública">
          <a href="#recursos" onClick={closeMenu}>Recursos</a>
          <a href="#como-funciona" onClick={closeMenu}>Como funciona</a>
          <a href="#planos" onClick={closeMenu}>Planos</a>
          <Link className="landing-nav-login" to="/login" onClick={closeMenu}>Entrar</Link>
          <LandingButton href="/register" variant="primary">Começar grátis</LandingButton>
        </nav>
      </div>
    </header>

    <main id="landing-content">
      <section className="landing-hero" aria-labelledby="landing-hero-title">
        <WebThreads paused={motionPaused} />
        <div className="landing-container landing-hero-inner">
          <div className="landing-hero-copy"><p className="landing-kicker">METAS CLARAS. PROGRESSO VISÍVEL.</p><h1 id="landing-hero-title">Transforme metas em progresso visível.</h1><p className="landing-hero-description">Organize objetivos, acompanhe cada passo e avance sozinho ou junto com outras pessoas — com clareza para o que vem agora.</p><div className="landing-actions"><LandingButton href="/register">Começar gratuitamente <IconArrowUpRight size={17} stroke={1.9} aria-hidden="true" /></LandingButton><LandingButton href="/login" variant="secondary">Acessar o aplicativo</LandingButton></div><div className="landing-hero-utility"><p className="landing-hero-note">Sem cobrança nesta etapa demonstrativa.</p><button className="landing-motion-toggle" type="button" aria-pressed={motionPaused} onClick={() => setMotionPaused((paused) => !paused)}>{motionPaused ? <IconPlayerPlay size={14} stroke={2} aria-hidden="true" /> : <IconPlayerPause size={14} stroke={2} aria-hidden="true" />}{motionPaused ? 'Retomar linhas' : 'Pausar linhas'}</button></div></div>
          <LandingGoalPreview />
        </div>
      </section>

      <section className="landing-section landing-resources" id="recursos" aria-labelledby="resources-title"><div className="landing-container"><div className="landing-section-intro"><p className="landing-kicker">UM LUGAR PARA AVANÇAR</p><h2 id="resources-title">Do que você quer fazer ao que já está acontecendo.</h2><p>MissionLive deixa a próxima ação à vista e o restante organizado. Cada meta tem um caminho que você consegue acompanhar.</p></div><div className="landing-feature-list"><LandingFeature icon={<IconTargetArrow size={24} stroke={1.8} />} title="Metas individuais">Dê forma a planos pessoais sem transformar organização em mais uma tarefa.</LandingFeature><LandingFeature icon={<IconUsersGroup size={24} stroke={1.8} />} title="Compartilhadas e de equipe">Convide as pessoas certas e mantenha o progresso de cada participante claro.</LandingFeature><LandingFeature icon={<IconChecklist size={24} stroke={1.8} />} title="Passos que orientam">Quebre objetivos em checklists simples e saiba o que já saiu do papel.</LandingFeature><LandingFeature icon={<IconBell size={24} stroke={1.8} />} title="Acompanhamento calmo">Use lembretes e sinais de progresso para retomar sem perder o ritmo.</LandingFeature></div></div></section>

      <section className="landing-section landing-how" id="como-funciona" aria-labelledby="how-title"><div className="landing-container"><div className="landing-section-intro"><p className="landing-kicker">COMO FUNCIONA</p><h2 id="how-title">Um caminho simples para seguir em frente.</h2></div><div className="landing-steps"><LandingStep index="01" title="Crie sua meta">Comece pelo que você quer realizar, com contexto e prazo quando fizer sentido.</LandingStep><LandingStep index="02" title="Organize seus passos">Transforme a intenção em ações pequenas que cabem na sua semana.</LandingStep><LandingStep index="03" title="Evolua acompanhado">Veja seu avanço e, quando quiser, convide pessoas para caminhar com você.</LandingStep></div></div></section>

      <section className="landing-section landing-preview-section" aria-labelledby="preview-title"><div className="landing-container landing-preview-layout"><div className="landing-section-intro"><p className="landing-kicker">A EXPERIÊNCIA NO DIA A DIA</p><h2 id="preview-title">Clareza para o próximo passo. Contexto para o caminho inteiro.</h2><p>Uma visão objetiva para retomar metas, conferir o andamento e manter cada pessoa alinhada sem ruído.</p><Link className="landing-text-link" to="/register">Comece a explorar <IconArrowUpRight size={17} stroke={1.9} aria-hidden="true" /></Link></div><LandingProductPreview /></div></section>

      <section className="landing-section landing-plans" id="planos" aria-labelledby="plans-title"><div className="landing-container"><div className="landing-section-intro"><p className="landing-kicker">PLANOS</p><h2 id="plans-title">Comece leve. Cresça quando fizer sentido.</h2><p>Os planos abaixo são demonstrativos nesta primeira versão — sem cobrança ou contratação.</p></div><div className="landing-plan-grid">{plans.map((plan) => <article className={`landing-plan${plan.featured ? ' is-featured' : ''}`} key={plan.name}><div className="landing-plan-heading"><div><h3>{plan.name}</h3><p>{plan.description}</p></div>{plan.featured && <span className="landing-plan-badge">EM BREVE</span>}</div><strong className="landing-plan-price">{plan.price}</strong><ul>{plan.features.map((feature) => <li key={feature}><IconCheck size={17} stroke={2.2} aria-hidden="true" />{feature}</li>)}</ul>{plan.disabled ? <button className="landing-button landing-button-plan-disabled" type="button" disabled>{plan.cta}</button> : <LandingButton href={plan.href ?? '/register'} variant={plan.featured ? 'secondary' : 'primary'}>{plan.cta}</LandingButton>}</article>)}</div></div></section>

      <section className="landing-final-cta" aria-labelledby="final-cta-title"><div className="landing-container landing-final-cta-inner"><div><p className="landing-kicker">SEU PRÓXIMO PASSO</p><h2 id="final-cta-title">Comece a transformar seus objetivos em progresso.</h2></div><LandingButton href="/register" variant="secondary">Criar minha conta <IconArrowUpRight size={17} stroke={1.9} aria-hidden="true" /></LandingButton></div></section>
    </main>

    <footer className="landing-footer"><div className="landing-container landing-footer-inner"><Link className="landing-footer-brand" to="/"><LandingLogo loading="lazy" /></Link><nav aria-label="Navegação do rodapé"><a href="#recursos">Recursos</a><a href="#como-funciona">Como funciona</a><a href="#planos">Planos</a><Link to="/login">Entrar</Link></nav><p>© 2026 MissionLive. Metas claras, progresso visível.</p></div></footer>
  </div>;
}
