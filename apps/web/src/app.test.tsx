/* @vitest-environment jsdom */
import { renderToString } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import { fireEvent, render } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { MissionLiveWelcome, ParticipantProgressSection, Sidebar } from './app';
import type { ParticipantsProgress } from './api';

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
