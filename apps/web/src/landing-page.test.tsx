/* @vitest-environment jsdom */
import '@testing-library/jest-dom/vitest';
import { cleanup, fireEvent, render } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { LandingPage } from './landing-page';

vi.mock('./web-threads', () => ({ WebThreads: () => <canvas aria-hidden="true" data-testid="web-threads" /> }));

afterEach(() => cleanup());

describe('LandingPage', () => {
  it('apresenta a proposta, os recursos, a prévia e os planos', () => {
    const view = render(<MemoryRouter><LandingPage /></MemoryRouter>);
    expect(view.getByRole('heading', { level: 1, name: 'Transforme metas em progresso visível.' })).toBeTruthy();
    expect(view.getByRole('heading', { name: 'Do que você quer fazer ao que já está acontecendo.' })).toBeTruthy();
    expect(view.getByRole('heading', { name: 'Comece leve. Cresça quando fizer sentido.' })).toBeTruthy();
    expect(view.getByText('Dados de demonstração')).toBeTruthy();
    expect(view.getByRole('heading', { name: 'Olá, Ana.' })).toBeTruthy();
    expect(view.getByRole('heading', { name: 'Defina seus próximos passos' })).toBeTruthy();
    expect(view.getByText('Metas ativas')).toBeTruthy();
    expect(view.queryByText('Sem cobrança nesta etapa demonstrativa.')).not.toBeInTheDocument();
    expect(view.queryByText(/primeira versão|etapa demonstrativa|sem cobrança ou contratação/i)).not.toBeInTheDocument();
    expect(view.getAllByRole('link', { name: /Começar gratuitamente/ })[0]).toHaveAttribute('href', '/register');
    expect(view.getByRole('button', { name: 'Em breve' })).toBeDisabled();
    expect(view.getByRole('button', { name: 'Pausar linhas' })).toHaveAttribute('aria-pressed', 'false');
  });

  it('pausa e retoma o movimento visual pelo controle de acessibilidade', () => {
    const view = render(<MemoryRouter><LandingPage /></MemoryRouter>);
    const motionButton = view.getByRole('button', { name: 'Pausar linhas' });
    fireEvent.click(motionButton);
    expect(view.getByRole('button', { name: 'Retomar linhas' })).toHaveAttribute('aria-pressed', 'true');
    fireEvent.click(view.getByRole('button', { name: 'Retomar linhas' }));
    expect(view.getByRole('button', { name: 'Pausar linhas' })).toHaveAttribute('aria-pressed', 'false');
  });

  it('abre o menu público no mobile e devolve o foco ao gatilho ao fechar com Escape', () => {
    const view = render(<MemoryRouter><LandingPage /></MemoryRouter>);
    const menuButton = view.getByRole('button', { name: 'Abrir menu' });
    fireEvent.click(menuButton);
    expect(menuButton).toHaveAttribute('aria-expanded', 'true');
    expect(view.getByRole('navigation', { name: 'Navegação pública' })).toHaveClass('is-open');
    fireEvent.keyDown(document, { key: 'Escape' });
    expect(view.getByRole('button', { name: 'Abrir menu' })).toHaveAttribute('aria-expanded', 'false');
    expect(document.activeElement).toBe(menuButton);
  });
});
