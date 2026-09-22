/* @vitest-environment jsdom */
import { afterEach, describe, expect, it, vi } from 'vitest';
import { act, cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter, useSearchParams } from 'react-router-dom';
import { api } from './api';
import type { Goal, GoalsPage as GoalsPageResponse, GoalsQuery } from './api';
import { GoalsPage } from './app';

afterEach(() => { cleanup(); vi.restoreAllMocks(); });

function goal(name: string): Goal {
  return {
    id: name,
    ownerUserId: 'user-a',
    name,
    description: null,
    status: 'active',
    startDate: '2026-09-01T00:00:00.000Z',
    endDate: null,
    recurrenceType: 'NONE',
    team: null,
    members: [],
    tags: [],
    steps: [],
    progressSummary: { completedSteps: 0, totalSteps: 0, participantCount: 1, completedParticipants: 0 },
  };
}

function response(page: number, totalPages: number, name: string, totalItems = totalPages * 12): GoalsPageResponse {
  return { items: [goal(name)], pagination: { page, pageSize: 12, totalItems, totalPages } };
}

function SearchParamsProbe() {
  const [searchParams] = useSearchParams();
  return <output data-testid="route-search">{searchParams.toString()}</output>;
}

function renderGoalsPage(initialEntry = '/goals') {
  vi.spyOn(api, 'categories').mockResolvedValue([]);
  return render(<MemoryRouter initialEntries={[initialEntry]}><GoalsPage /><SearchParamsProbe /></MemoryRouter>);
}

describe('GoalsPage pagination', () => {
  it('navega para próxima e anterior página com estados disabled corretos', async () => {
    const request = vi.spyOn(api, 'goals')
      .mockResolvedValueOnce(response(1, 2, 'Meta da página 1'))
      .mockResolvedValueOnce(response(2, 2, 'Meta da página 2'))
      .mockResolvedValueOnce(response(1, 2, 'Meta da página 1'));
    renderGoalsPage();

    await screen.findByText('Meta da página 1');
    expect((screen.getByRole('button', { name: 'Página anterior' }) as HTMLButtonElement).disabled).toBe(true);
    fireEvent.click(screen.getByRole('button', { name: 'Próxima página' }));
    await screen.findByText('Meta da página 2');
    expect(screen.getByText('Página 2 de 2')).toBeTruthy();
    expect(screen.getByTestId('route-search').textContent).toBe('page=2');
    expect((screen.getByRole('button', { name: 'Próxima página' }) as HTMLButtonElement).disabled).toBe(true);
    expect(request).toHaveBeenNthCalledWith(2, expect.objectContaining({ page: 2, pageSize: 12 }));

    fireEvent.click(screen.getByRole('button', { name: 'Página anterior' }));
    await screen.findByText('Meta da página 1');
    expect(screen.getByTestId('route-search').textContent).toBe('');
    expect(request).toHaveBeenNthCalledWith(3, expect.objectContaining({ page: 1, pageSize: 12 }));
  });

  it('restaura página e filtros da query string ao abrir um link direto', async () => {
    const request = vi.spyOn(api, 'goals').mockResolvedValueOnce(response(2, 2, 'Meta compartilhada por link'));
    renderGoalsPage('/goals?page=2&status=active&sort=name');

    await screen.findByText('Meta compartilhada por link');

    expect(request).toHaveBeenCalledWith(expect.objectContaining({ page: 2, status: 'active', sort: 'name' }));
    expect(screen.getByLabelText('Status')).toHaveProperty('value', 'active');
    expect(screen.getByLabelText('Ordenar')).toHaveProperty('value', 'name');
  });

  it('oculta a paginação quando há zero ou uma página', async () => {
    vi.spyOn(api, 'goals').mockResolvedValueOnce(response(1, 1, 'Meta única'));
    renderGoalsPage();
    await screen.findByText('Meta única');
    expect(screen.queryByRole('navigation', { name: 'Paginação de metas' })).toBeNull();
  });

  it('reinicia a página ao alterar filtro e ordenação e ao limpar filtros', async () => {
    const request = vi.spyOn(api, 'goals').mockImplementation(async (query: GoalsQuery = {}) => response(query.page ?? 1, 3, `Resultado ${query.status ?? 'todos'} ${query.sort ?? 'recent'}`));
    renderGoalsPage();
    await screen.findByText('Resultado todos recent');
    fireEvent.click(screen.getByRole('button', { name: 'Próxima página' }));
    await screen.findByText('Resultado todos recent');
    await waitFor(() => expect(request).toHaveBeenLastCalledWith(expect.objectContaining({ page: 2 })));

    fireEvent.change(screen.getByLabelText('Status'), { target: { value: 'active' } });
    await screen.findByText('Resultado active recent');
    expect(request).toHaveBeenLastCalledWith(expect.objectContaining({ page: 1, status: 'active' }));

    fireEvent.click(screen.getByRole('button', { name: 'Próxima página' }));
    await waitFor(() => expect(request).toHaveBeenLastCalledWith(expect.objectContaining({ page: 2, status: 'active' })));
    fireEvent.change(screen.getByLabelText('Ordenar'), { target: { value: 'name' } });
    await screen.findByText('Resultado active name');
    expect(request).toHaveBeenLastCalledWith(expect.objectContaining({ page: 1, status: 'active', sort: 'name' }));

    fireEvent.click(screen.getByRole('button', { name: 'Limpar filtros' }));
    await screen.findByText('Resultado todos recent');
    expect(screen.getByTestId('route-search').textContent).toBe('');
    expect(request).toHaveBeenLastCalledWith(expect.objectContaining({ page: 1, sort: 'recent', status: undefined }));
  });

  it('mantém debounce de busca e volta à página 1 antes da nova consulta', async () => {
    const request = vi.spyOn(api, 'goals').mockImplementation(async (query: GoalsQuery = {}) => response(query.page ?? 1, 3, query.q ? `Busca ${query.q}` : 'Todas'));
    renderGoalsPage();
    await screen.findByRole('heading', { name: 'Todas' });
    fireEvent.click(screen.getByRole('button', { name: 'Próxima página' }));
    await waitFor(() => expect(request).toHaveBeenLastCalledWith(expect.objectContaining({ page: 2 })));
    const callsBeforeSearch = request.mock.calls.length;

    fireEvent.change(screen.getByPlaceholderText('Nome, descrição ou tag'), { target: { value: 'corrida' } });
    expect(request).toHaveBeenCalledTimes(callsBeforeSearch);
    await screen.findByText('Busca corrida');
    expect(request).toHaveBeenLastCalledWith(expect.objectContaining({ page: 1, q: 'corrida' }));
  });

  it('sincroniza a página clamped pelo servidor sem disparar uma requisição em loop', async () => {
    const request = vi.spyOn(api, 'goals')
      .mockResolvedValueOnce(response(1, 2, 'Página 1'))
      .mockResolvedValueOnce({ items: [goal('Página efetiva')], pagination: { page: 1, pageSize: 12, totalItems: 8, totalPages: 1 } });
    renderGoalsPage();
    await screen.findByText('Página 1');
    fireEvent.click(screen.getByRole('button', { name: 'Próxima página' }));
    await screen.findByText('Página efetiva');
    await act(async () => new Promise((resolve) => window.setTimeout(resolve, 240)));

    expect(request).toHaveBeenCalledTimes(2);
    expect(screen.queryByRole('navigation', { name: 'Paginação de metas' })).toBeNull();
  });

  it('cancela a atualização local quando a tela é desmontada com uma página pendente', async () => {
    let resolvePendingPage: ((value: GoalsPageResponse) => void) | undefined;
    const request = vi.spyOn(api, 'goals').mockImplementation((query: GoalsQuery = {}) => {
      if (query.page === 2) return new Promise((resolve) => { resolvePendingPage = resolve; });
      return Promise.resolve(response(1, 2, 'Página inicial'));
    });
    const view = renderGoalsPage();
    await screen.findByText('Página inicial');
    fireEvent.click(screen.getByRole('button', { name: 'Próxima página' }));
    await waitFor(() => expect(request).toHaveBeenLastCalledWith(expect.objectContaining({ page: 2 })));
    view.unmount();
    await act(async () => { resolvePendingPage?.(response(2, 2, 'Resposta após desmontar')); });
    expect(screen.queryByText('Resposta após desmontar')).toBeNull();
  });

  it('preserva EmptyState e mensagem de erro', async () => {
    vi.spyOn(api, 'goals').mockResolvedValueOnce({ items: [], pagination: { page: 1, pageSize: 12, totalItems: 0, totalPages: 0 } });
    const emptyView = renderGoalsPage();
    await screen.findByText('Nenhuma meta encontrada');
    emptyView.unmount();

    vi.spyOn(api, 'categories').mockResolvedValue([]);
    vi.spyOn(api, 'goals').mockRejectedValueOnce(new Error('Falha ao carregar'));
    render(<MemoryRouter><GoalsPage /></MemoryRouter>);
    await screen.findByRole('alert');
    expect(screen.getByText('Falha ao carregar')).toBeTruthy();
  });
});
