/* @vitest-environment jsdom */
import '@testing-library/jest-dom/vitest';
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { MemoryRouter } from 'react-router-dom';
import { AuthScreen } from './app';
import { api } from './api';

afterEach(() => { cleanup(); vi.restoreAllMocks(); });

const user = { id: 'user-1', name: 'Ana', email: 'ana@example.com' };

describe('AuthScreen', () => {
  it('inicia desmarcado e envia false no login local', async () => {
    const login = vi.spyOn(api, 'login').mockResolvedValue({ user }); const onAuthenticated = vi.fn();
    render(<MemoryRouter><AuthScreen onAuthenticated={onAuthenticated} /></MemoryRouter>);
    const checkbox = screen.getByRole('checkbox', { name: 'Manter-me conectado' });
    expect(checkbox).not.toBeChecked(); fireEvent.change(screen.getByLabelText('E-mail'), { target: { value: 'ana@example.com' } }); fireEvent.change(screen.getByLabelText('Senha'), { target: { value: 'senha-segura' } }); fireEvent.click(screen.getByRole('button', { name: 'Entrar' }));
    await waitFor(() => expect(login).toHaveBeenCalledWith({ email: 'ana@example.com', password: 'senha-segura', rememberMe: false }));
  });

  it('envia true sem perder a seleção em erro e leva a escolha assinável ao Google', async () => {
    const login = vi.spyOn(api, 'login').mockRejectedValue(new Error('Credenciais inválidas.'));
    render(<MemoryRouter><AuthScreen onAuthenticated={vi.fn()} /></MemoryRouter>);
    const checkbox = screen.getByRole('checkbox', { name: 'Manter-me conectado' }); fireEvent.click(checkbox); expect(checkbox).toBeChecked();
    fireEvent.change(screen.getByLabelText('E-mail'), { target: { value: 'ana@example.com' } }); fireEvent.change(screen.getByLabelText('Senha'), { target: { value: 'senha-segura' } }); fireEvent.click(screen.getByRole('button', { name: 'Entrar' }));
    await waitFor(() => expect(login).toHaveBeenCalledWith({ email: 'ana@example.com', password: 'senha-segura', rememberMe: true }));
    expect(checkbox).toBeChecked(); expect(screen.getByRole('link', { name: 'Continuar com Google' })).toHaveAttribute('href', expect.stringContaining('rememberMe=true'));
  });
});
