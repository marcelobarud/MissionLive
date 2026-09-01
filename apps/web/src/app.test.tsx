import { renderToString } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import { MemoryRouter } from 'react-router-dom';
import { MissionLiveWelcome, Sidebar } from './app';

describe('MissionLive shell', () => {
  it('renders the welcome message', () => {
    expect(renderToString(<MissionLiveWelcome />)).toContain('Suas metas, em movimento.');
  });

  it('renders the authenticated sidebar with account actions', () => {
    const html = renderToString(<MemoryRouter><Sidebar user={{ id: 'user-a', name: 'Ana', email: 'ana@example.com' }} open onClose={() => undefined} onLogout={() => undefined} /></MemoryRouter>);
    expect(html).toContain('Navegação principal');
    expect(html).toContain('Início');
    expect(html).toContain('Metas');
    expect(html).toContain('Avisos');
    expect(html).toContain('Ana');
    expect(html).toContain('Sair');
    expect(html).toContain('Fechar menu');
  });
});
