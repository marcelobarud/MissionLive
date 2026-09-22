/* @vitest-environment jsdom */
import '@testing-library/jest-dom/vitest';
import { cleanup, fireEvent, render } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { LandingPage } from './landing-page';

vi.mock('./web-threads', () => ({ WebThreads: () => <div aria-hidden="true" className="web-threads-container" data-testid="web-threads" /> }));

afterEach(() => cleanup());

describe('LandingPage', () => {
  it('mantém o Web Threads como uma camada direta do Hero', () => {
    const view = render(<MemoryRouter><LandingPage /></MemoryRouter>);
    expect(view.container.querySelector('.landing-hero > .web-threads-container')).toBeInTheDocument();
  });

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
    expect(view.container.querySelector('.landing-product-mark')).toHaveAttribute('src', '/brand/missionlive-symbol.svg');
    expect(view.queryByRole('button', { name: /Pausar linhas|Retomar linhas/ })).not.toBeInTheDocument();
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
