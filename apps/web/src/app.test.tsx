/* @vitest-environment jsdom */
import { renderToString } from 'react-dom/server';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { fireEvent, render, waitFor } from '@testing-library/react';
import { MemoryRouter, useLocation } from 'react-router-dom';
import { goalStepPreview, homeGoalStepsSummary, MissionLiveWelcome, NotificationsPage, ParticipantProgressSection, Sidebar } from './app';
import { api } from './api';
import type { Notification, ParticipantsProgress } from './api';

const participantProgress: ParticipantsProgress = {
  totalParticipants: 3,
  participantsCompleted: 1,
  collectiveCompletedSteps: 5,
  collectiveTotalSteps: 9,
  collectivePercentage: 55.6,
  participants: [
    { userId: 'user-a', name: 'Teste A', avatarUrl: null, role: 'owner', completedSteps: 3, totalSteps: 3, percentage: 100, completed: true, status: 'completed', steps: [{ id: 'step-1', title: 'Definir escopo', position: 0, completed: true, completedAt: '2026-08-29T22:42:00.000Z' }] },
    { userId: 'user-b', name: 'Teste B', avatarUrl: null, role: 'viewer', completedSteps: 1, totalSteps: 3, percentage: 33.3, completed: false, status: 'in-progress', steps: [{ id: 'step-1', title: 'Definir escopo', position: 0, completed: true, completedAt: '2026-08-30T11:15:00.000Z' }, { id: 'step-2', title: 'Revisar resultado', position: 1, completed: false, completedAt: null }] },
    { userId: 'user-c', name: 'Teste C', avatarUrl: null, role: 'editor', completedSteps: 0, totalSteps: 3, percentage: 0, completed: false, status: 'not-started', steps: [{ id: 'step-1', title: 'Definir escopo', position: 0, completed: false, completedAt: null }] },
  ],
};

afterEach(() => vi.restoreAllMocks());

function LocationProbe() {
  return <span data-testid="location">{useLocation().pathname}</span>;
}

describe('MissionLive shell', () => {
  it('resume passos ativos com a mesma semântica do progresso e trata metas sem passos', () => {
    const partialGoal = { steps: [{ id: 'step-1', title: 'Primeiro', position: 0 }], progressSummary: { completedSteps: 1, totalSteps: 2, participantCount: 1, completedParticipants: 0 } } as unknown as Parameters<typeof homeGoalStepsSummary>[0];
    const completeGoal = { steps: [{ id: 'step-1', title: 'Primeiro', position: 0 }], progressSummary: { completedSteps: 3, totalSteps: 3, participantCount: 1, completedParticipants: 1 } } as unknown as Parameters<typeof homeGoalStepsSummary>[0];
    const emptyGoal = { steps: [], progressSummary: { completedSteps: 0, totalSteps: 0, participantCount: 1, completedParticipants: 0 } } as unknown as Parameters<typeof homeGoalStepsSummary>[0];
    expect(homeGoalStepsSummary(partialGoal)).toEqual({ label: '1/2 passos', ariaLabel: '1 concluídos, 1 faltantes' });
    expect(homeGoalStepsSummary(completeGoal)).toEqual({ label: '3/3 passos', ariaLabel: '3 concluídos, 0 faltantes' });
    expect(homeGoalStepsSummary(emptyGoal)).toEqual({ label: 'Sem passos', ariaLabel: 'Meta sem passos' });
  });

  it('limita a prévia a cinco passos e prioriza os concluídos', () => {
    const goal = { steps: [
      { id: 'step-1', title: 'Pendente 1', position: 0, progresses: [] },
      { id: 'step-2', title: 'Concluído 1', position: 1, progresses: [{ userId: 'user-a', completed: true }] },
      { id: 'step-3', title: 'Pendente 2', position: 2, progresses: [] },
      { id: 'step-4', title: 'Concluído 2', position: 3, progresses: [{ userId: 'user-a', completed: true }] },
      { id: 'step-5', title: 'Pendente 3', position: 4, progresses: [] },
      { id: 'step-6', title: 'Pendente 4', position: 5, progresses: [] },
    ] } as unknown as Parameters<typeof goalStepPreview>[0];
    expect(goalStepPreview(goal).map((step) => step.title)).toEqual(['Concluído 1', 'Concluído 2', 'Pendente 1', 'Pendente 2', 'Pendente 3']);
  });

  it('renders the welcome message', () => {
    expect(renderToString(<MissionLiveWelcome />)).toContain('Suas metas, em movimento.');
  });

  it('renders the authenticated sidebar with account actions', () => {
    const html = renderToString(<MemoryRouter><Sidebar user={{ id: 'user-a', name: 'Ana', email: 'ana@example.com' }} open onClose={() => undefined} onLogout={() => undefined} unreadCount={3} /></MemoryRouter>);
    expect(html).toContain('Navegação principal');
    expect(html).toContain('Início');
    expect(html).toContain('Metas');
    expect(html).toContain('Avisos');
    expect(html).toContain('Ana');
    expect(html).toContain('Sair');
    expect(html).toContain('Fechar menu');
    expect(html).toContain('>3</span>');
  });

  it('separa avisos lidos e não lidos e sincroniza marcar todos', async () => {
    const notifications: Notification[] = [
      { id: 'notification-unread', type: 'comment_created', title: 'Aviso novo', body: 'Há uma atualização na meta.', goalId: null, teamId: null, readAt: null, createdAt: '2026-09-08T12:00:00.000Z' },
      { id: 'notification-read', type: 'goal_updated', title: 'Aviso lido', body: 'Uma meta foi atualizada.', goalId: null, teamId: null, readAt: '2026-09-07T12:00:00.000Z', createdAt: '2026-09-07T12:00:00.000Z' },
    ];
    vi.spyOn(api, 'notifications').mockResolvedValue(notifications);
    vi.spyOn(api, 'unreadNotifications').mockResolvedValue({ count: 1 });
    const readAll = vi.spyOn(api, 'readAllNotifications').mockResolvedValue({ read: true });
    const refreshUnread = vi.fn(async () => undefined);
    let currentUnread = 1;
    const updateUnread = (value: number | ((current: number) => number)) => { currentUnread = typeof value === 'function' ? value(currentUnread) : value; };
    const view = render(<MemoryRouter><NotificationsPage unreadCount={currentUnread} onUnreadCountChange={updateUnread} onRefreshUnreadCount={refreshUnread} /></MemoryRouter>);

    await waitFor(() => expect(view.getByText('Aviso novo')).toBeTruthy());
    expect(view.queryByText('Aviso lido')).toBeNull();
    expect(view.getByRole('tab', { name: /Não lidos/ }).getAttribute('aria-selected')).toBe('true');

    fireEvent.click(view.getByRole('tab', { name: 'Lidos' }));
    expect(view.getByText('Aviso lido')).toBeTruthy();
    expect(view.queryByText('Aviso novo')).toBeNull();

    fireEvent.click(view.getByRole('tab', { name: /Não lidos/ }));
    fireEvent.click(view.getByRole('button', { name: 'Marcar todos como lidos' }));
    await waitFor(() => expect(readAll).toHaveBeenCalledOnce());
    expect(currentUnread).toBe(0);
    expect(view.queryByText('Aviso novo')).toBeNull();
    fireEvent.click(view.getByRole('tab', { name: 'Lidos' }));
    expect(view.getByText('Aviso novo')).toBeTruthy();
    expect(view.getByText('Aviso lido')).toBeTruthy();
    expect(refreshUnread).toHaveBeenCalled();
  });

  it('marca um aviso individual como lido e preserva o deep link', async () => {
    const unread: Notification = { id: 'notification-goal', type: 'goal_updated', title: 'Meta atualizada', body: 'A meta recebeu uma atualização.', goalId: 'goal-1', teamId: null, readAt: null, createdAt: '2026-09-08T12:00:00.000Z' };
    const read: Notification = { ...unread, readAt: '2026-09-08T12:01:00.000Z' };
    vi.spyOn(api, 'notifications').mockResolvedValue([unread]);
    vi.spyOn(api, 'unreadNotifications').mockResolvedValue({ count: 1 });
    const markRead = vi.spyOn(api, 'readNotification').mockResolvedValue(read);
    const refreshUnread = vi.fn(async () => undefined);
    let currentUnread = 1;
    const updateUnread = (value: number | ((current: number) => number)) => { currentUnread = typeof value === 'function' ? value(currentUnread) : value; };
    const view = render(<MemoryRouter><NotificationsPage unreadCount={currentUnread} onUnreadCountChange={updateUnread} onRefreshUnreadCount={refreshUnread} /><LocationProbe /></MemoryRouter>);

    await waitFor(() => expect(view.getByText('Meta atualizada')).toBeTruthy());
    fireEvent.click(view.getByRole('button', { name: /Meta atualizada/ }));
    await waitFor(() => expect(markRead).toHaveBeenCalledWith('notification-goal'));
    expect(currentUnread).toBe(0);
    expect(refreshUnread).toHaveBeenCalled();
    await waitFor(() => expect(view.getByTestId('location').textContent).toBe('/goals/goal-1'));
  });

  it('renders and expands participant progress in read-only mode', () => {
    const { getByRole, getByText, queryByRole, container } = render(<ParticipantProgressSection progress={participantProgress} currentUserId="user-a" />);
    expect(getByRole('heading', { name: 'Progresso dos participantes' })).toBeTruthy();
    expect(getByText('1 de 3 participantes concluíram todos os objetivos')).toBeTruthy();
    expect(getByText('Ainda não iniciou')).toBeTruthy();
    expect(queryByRole('checkbox')).toBeNull();
    fireEvent.click(getByRole('button', { name: /Teste B/ }));
    expect(getByText(/Concluído em 30\/08\/2026/)).toBeTruthy();
    expect(getByText('Pendente')).toBeTruthy();
    expect(container.querySelector('[aria-expanded="true"]')).toBeTruthy();
  });
});
