/* @vitest-environment jsdom */
import { renderToString } from 'react-dom/server';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { render, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { AdminPage, Sidebar } from './app';
import { api, AdminOverview, User } from './api';

const overview: AdminOverview = {
  users: { total: 5, active: 3, newThisMonth: 2 },
  goals: { total: 7, active: 4, completed: 3 },
  teams: { total: 2 },
  photos: { total: 6 },
};

const user: User = { id: 'user-1', name: 'Ana', email: 'ana@example.com', platformRole: 'USER' };

afterEach(() => vi.restoreAllMocks());

describe('painel administrativo', () => {
  it('não mostra Administração para usuário comum', () => {
    const html = renderToString(<MemoryRouter><Sidebar user={user} open onClose={() => undefined} onLogout={() => undefined} /></MemoryRouter>);
    expect(html).not.toContain('Administração');
  });

  it.each(['ADMIN', 'SUPER_ADMIN'] as const)('mostra Administração para %s', (platformRole) => {
    const html = renderToString(<MemoryRouter><Sidebar user={{ ...user, platformRole }} open onClose={() => undefined} onLogout={() => undefined} /></MemoryRouter>);
    expect(html).toContain('Administração');
    expect(html).toContain('/admin');
  });

  it.each(['ADMIN', 'SUPER_ADMIN'] as const)('carrega os mesmos blocos de métricas para %s', async (platformRole) => {
    const request = vi.spyOn(api, 'adminOverview').mockResolvedValue(overview);
    const view = render(<MemoryRouter><AdminPage user={{ ...user, platformRole }} /></MemoryRouter>);

    await waitFor(() => expect(view.getByRole('heading', { name: 'Visão geral' })).toBeTruthy());
    expect(request).toHaveBeenCalledOnce();
    expect(view.getByRole('heading', { name: 'Usuários' })).toBeTruthy();
    expect(view.getByRole('heading', { name: 'Metas' })).toBeTruthy();
    expect(view.getByRole('heading', { name: 'Equipes' })).toBeTruthy();
    expect(view.getByRole('heading', { name: 'Fotos' })).toBeTruthy();
    expect(view.getByText('Novos neste mês')).toBeTruthy();
    expect(view.getByText('6')).toBeTruthy();
    view.unmount();
  });

  it('não consulta o endpoint quando um usuário comum acessa a rota manualmente', () => {
    const request = vi.spyOn(api, 'adminOverview');
    render(<MemoryRouter initialEntries={['/admin']}><AdminPage user={user} /></MemoryRouter>);
    expect(request).not.toHaveBeenCalled();
  });

  it('mantém o estado de carregamento sem exibir métricas como zero', () => {
    vi.spyOn(api, 'adminOverview').mockReturnValue(new Promise<AdminOverview>(() => undefined));
    const view = render(<MemoryRouter><AdminPage user={{ ...user, platformRole: 'ADMIN' }} /></MemoryRouter>);

    expect(view.getByText('Carregando…')).toBeTruthy();
    expect(view.queryByText('Visão geral')).toBeNull();
    view.unmount();
  });

  it('exibe o estado de erro e permite uma nova tentativa', async () => {
    const request = vi.spyOn(api, 'adminOverview').mockRejectedValue(new Error('Falha de conexão'));
    const view = render(<MemoryRouter><AdminPage user={{ ...user, platformRole: 'ADMIN' }} /></MemoryRouter>);

    await waitFor(() => expect(view.getByText('Falha de conexão')).toBeTruthy());
    expect(view.getByRole('button', { name: 'Tentar novamente' })).toBeTruthy();
    expect(request).toHaveBeenCalledOnce();
    view.unmount();
  });

  it('preserva zeros válidos no resumo', async () => {
    vi.spyOn(api, 'adminOverview').mockResolvedValue({ users: { total: 1, active: 1, newThisMonth: 0 }, goals: { total: 0, active: 0, completed: 0 }, teams: { total: 0 }, photos: { total: 0 } });
    const view = render(<MemoryRouter><AdminPage user={{ ...user, platformRole: 'SUPER_ADMIN' }} /></MemoryRouter>);

    await waitFor(() => expect(view.getByRole('heading', { name: 'Visão geral' })).toBeTruthy());
    expect(view.getAllByText('0').length).toBeGreaterThanOrEqual(5);
    view.unmount();
  });
});
