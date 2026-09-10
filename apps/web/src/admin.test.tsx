/* @vitest-environment jsdom */
import { renderToString } from 'react-dom/server';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, waitFor } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { AdminPage, AdminUserDetailPage, AdminUsersPage, Sidebar } from './app';
import { api, AdminOverview, AdminUserDetail, AdminUsersResponse, User } from './api';
import { FeedbackProvider } from './feedback';

const overview: AdminOverview = {
  users: { total: 5, active: 3, newThisMonth: 2 },
  goals: { total: 7, active: 4, completed: 3 },
  teams: { total: 2 },
  photos: { total: 6 },
};

const user: User = { id: 'user-1', name: 'Ana', email: 'ana@example.com', platformRole: 'USER' };
const usersPage: AdminUsersResponse = { items: [{ id: 'user-2', name: 'Bruno', email: 'bruno@example.com', status: 'active', platformRole: 'USER', createdAt: '2026-09-10T12:00:00.000Z' }, { id: 'admin-1', name: 'Carla', email: 'carla@example.com', status: 'active', platformRole: 'ADMIN', createdAt: '2026-09-09T12:00:00.000Z' }], pagination: { page: 1, pageSize: 20, totalItems: 2, totalPages: 1 } };

afterEach(() => { cleanup(); vi.restoreAllMocks(); });

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
    expect(view.queryByRole('heading', { level: 2, name: 'Usuários' })).toBeNull();
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

  it('carrega usuários com navegação interna, filtros e ações seguras', async () => {
    const request = vi.spyOn(api, 'adminUsers').mockResolvedValue(usersPage);
    const view = render(<FeedbackProvider><MemoryRouter><AdminUsersPage user={{ ...user, platformRole: 'ADMIN' }} /></MemoryRouter></FeedbackProvider>);

    await waitFor(() => expect(view.getByRole('heading', { level: 1, name: 'Usuários' })).toBeTruthy());
    expect(view.getByText('Bruno')).toBeTruthy();
    expect(view.getByText('bruno@example.com')).toBeTruthy();
    expect(view.getByText('Administrador')).toBeTruthy();
    expect(view.getByPlaceholderText('Buscar por nome ou e-mail…')).toBeTruthy();
    expect(view.getByRole('link', { name: 'Visão geral' })).toBeTruthy();
    expect(view.getByRole('link', { name: 'Usuários' })).toBeTruthy();
    expect(request).toHaveBeenCalledWith({ page: 1, pageSize: 20, search: undefined, status: undefined });
    view.unmount();
  });

  it('reinicia a página e aplica busca/status sem exibir campos privados', async () => {
    const request = vi.spyOn(api, 'adminUsers').mockResolvedValue(usersPage);
    const view = render(<FeedbackProvider><MemoryRouter><AdminUsersPage user={{ ...user, platformRole: 'SUPER_ADMIN' }} /></MemoryRouter></FeedbackProvider>);
    await waitFor(() => expect(view.getByText('Bruno')).toBeTruthy());
    fireEvent.change(view.getByPlaceholderText('Buscar por nome ou e-mail…'), { target: { value: '  Bruno   Silva ' } });
    await waitFor(() => expect(request).toHaveBeenLastCalledWith({ page: 1, pageSize: 20, search: 'Bruno Silva', status: undefined }), { timeout: 1200 });
    fireEvent.change(view.getByLabelText('Status'), { target: { value: 'disabled' } });
    await waitFor(() => expect(request).toHaveBeenLastCalledWith({ page: 1, pageSize: 20, search: 'Bruno Silva', status: 'disabled' }), { timeout: 1200 });
    expect(view.queryByText('passwordHash')).toBeNull();
    view.unmount();
  });

  it('mostra erro da listagem e não deixa usuário comum consultar a API', async () => {
    const request = vi.spyOn(api, 'adminUsers').mockRejectedValue(new Error('Falha de conexão'));
    const view = render(<FeedbackProvider><MemoryRouter><AdminUsersPage user={user} /></MemoryRouter></FeedbackProvider>);
    expect(request).not.toHaveBeenCalled();
    view.unmount();
    const adminView = render(<FeedbackProvider><MemoryRouter><AdminUsersPage user={{ ...user, platformRole: 'ADMIN' }} /></MemoryRouter></FeedbackProvider>);
    await waitFor(() => expect(adminView.getByText('Falha de conexão')).toBeTruthy());
    expect(adminView.getByRole('button', { name: 'Tentar novamente' })).toBeTruthy();
    adminView.unmount();
  });

  it('exibe detalhes agregados e status sem dados privados', async () => {
    const detail: AdminUserDetail = { user: usersPage.items[0], stats: { goalsCreated: 3, teams: 1, photos: 2 } };
    vi.spyOn(api, 'adminUser').mockResolvedValue(detail);
    const view = render(<FeedbackProvider><MemoryRouter initialEntries={['/admin/users/user-2']}><Routes><Route path="/admin/users/:userId" element={<AdminUserDetailPage user={{ ...user, platformRole: 'ADMIN' }} />} /></Routes></MemoryRouter></FeedbackProvider>);
    await waitFor(() => expect(view.getByRole('heading', { level: 1, name: 'Bruno' })).toBeTruthy());
    expect(view.getByText('Metas criadas')).toBeTruthy();
    expect(view.getByText('Fotos publicadas')).toBeTruthy();
    expect(view.getByRole('button', { name: 'Desativar usuário' })).toBeTruthy();
    expect(view.queryByText('passwordHash')).toBeNull();
    view.unmount();
  });
});
