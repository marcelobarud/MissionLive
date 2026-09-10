/* @vitest-environment jsdom */
import '@testing-library/jest-dom/vitest';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { MemoryRouter } from 'react-router-dom';
import { FeedbackProvider } from './feedback';
import { api } from './api';
import { ProfilePage } from './app';
import * as push from './push';

afterEach(() => vi.restoreAllMocks());

describe('ProfilePage', () => {
  it('envia dados opcionais, permite UF brasileira e mantém timezone independente', async () => {
    vi.spyOn(push, 'getDevicePushState').mockResolvedValue({ supported: false, permission: 'unsupported', subscribed: false, serverEnabled: false });
    const updateProfile = vi.spyOn(api, 'updateProfile').mockResolvedValue({ id: 'user-1', name: 'Ana', email: 'ana@example.com', timezone: 'America/Sao_Paulo', countryCode: 'BR', region: 'SP', city: 'Campinas', phone: '+5511999999999', birthDate: '1990-05-10' });
    render(<FeedbackProvider><MemoryRouter><ProfilePage user={{ id: 'user-1', name: 'Ana', email: 'ana@example.com', timezone: 'America/Sao_Paulo' }} onUpdated={vi.fn()} /></MemoryRouter></FeedbackProvider>);
    fireEvent.change(screen.getByLabelText('Telefone'), { target: { value: '+55 (11) 99999-9999' } });
    fireEvent.change(screen.getByLabelText('Data de nascimento'), { target: { value: '1990-05-10' } });
    const country = screen.getByRole('combobox', { name: 'País' }); fireEvent.focus(country); fireEvent.change(country, { target: { value: 'br' } }); fireEvent.click(screen.getByRole('option', { name: /Brasil/ }));
    fireEvent.change(screen.getByLabelText('Estado/Região'), { target: { value: 'SP' } });
    fireEvent.change(screen.getByLabelText('Cidade'), { target: { value: 'Campinas' } });
    fireEvent.click(screen.getByRole('button', { name: 'Salvar perfil' }));
    await waitFor(() => expect(updateProfile).toHaveBeenCalledWith(expect.objectContaining({ phone: '+55 (11) 99999-9999', birthDate: '1990-05-10', countryCode: 'BR', region: 'SP', city: 'Campinas', timezone: 'America/Sao_Paulo' })));
  });
});
