/* @vitest-environment jsdom */
import '@testing-library/jest-dom/vitest';
import { fireEvent, render, screen, waitFor, cleanup } from '@testing-library/react';
import { renderToString } from 'react-dom/server';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { AVATAR_PRESETS, AvatarManager, UserAvatar, avatarInitials } from './avatar';
import { api } from './api';
import { FeedbackProvider } from './feedback';

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
});

describe('user avatars', () => {
  it('defines the ten official presets in the stable display order', () => {
    expect(AVATAR_PRESETS.map((item) => item.label)).toEqual(['Samurai', 'Ninja', 'Cachorro', 'Gato', 'Sapo', 'Galo', 'Corredor', 'Homem de terno', 'Mulher de terno', 'Avião']);
    expect(AVATAR_PRESETS.map((item) => item.id)).toEqual(['avatar-01', 'avatar-02', 'avatar-03', 'avatar-04', 'avatar-05', 'avatar-06', 'avatar-07', 'avatar-08', 'avatar-09', 'avatar-10']);
    expect(AVATAR_PRESETS.every((item) => item.imageSrc.startsWith('/avatars/presets/'))).toBe(true);
  });

  it('falls back to initials', () => {
    expect(avatarInitials('Ana Souza')).toBe('AS');
    expect(renderToString(<UserAvatar user={{ name: 'Ana Souza' }} />)).toContain('AS');
  });

  it('renders a saved preset through the official static asset', () => {
    const html = renderToString(<UserAvatar user={{ name: 'Ana', avatar: { type: 'preset', presetId: 'avatar-03', url: null } }} size="lg" />);
    expect(html).toContain('user-avatar-lg'); expect(html).toContain('/avatars/presets/avatar-preset-03-cachorro.png'); expect(html).not.toContain('avatarFileKey');
  });

  it('shows the ten official presets and sends the selected stable ID', async () => {
    const user = { id: 'user-1', email: 'ana@example.com', name: 'Ana' };
    const next = { ...user, avatar: { type: 'preset' as const, presetId: 'avatar-10', url: null } };
    const setAvatarPreset = vi.spyOn(api, 'setAvatarPreset').mockResolvedValue(next);
    const onUpdated = vi.fn();
    render(<FeedbackProvider><AvatarManager user={user} onUpdated={onUpdated} /></FeedbackProvider>);
    fireEvent.click(screen.getByRole('button', { name: 'Escolher avatar' }));
    const presetButtons = screen.getAllByRole('button', { name: /^Avatar / });
    expect(presetButtons).toHaveLength(10);
    expect(presetButtons.map((button) => button.getAttribute('aria-label'))).toEqual(AVATAR_PRESETS.map((preset) => `Avatar ${preset.label}`));
    fireEvent.click(screen.getByRole('button', { name: 'Avatar Avião' }));
    await waitFor(() => expect(setAvatarPreset).toHaveBeenCalledWith('avatar-10'));
    expect(onUpdated).toHaveBeenCalledWith(next);
  });

  it('abre o seletor em dialog, fecha com ESC e restaura o foco', async () => {
    const trigger = 'Escolher avatar';
    render(<FeedbackProvider><AvatarManager user={{ id: 'user-1', email: 'ana@example.com', name: 'Ana' }} onUpdated={() => undefined} /></FeedbackProvider>);
    const button = screen.getByRole('button', { name: trigger });
    button.focus();
    fireEvent.click(button);
    expect(screen.getByRole('dialog', { name: 'Escolha seu avatar' })).toBeInTheDocument();
    fireEvent.keyDown(document, { key: 'Escape' });
    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument());
    expect(document.activeElement).toBe(button);
  });

  it('loads uploaded avatars through the API CORS boundary', () => {
    const html = renderToString(<UserAvatar user={{ name: 'Ana', avatar: { type: 'upload', presetId: null, url: '/media/avatars/user/file.webp' } }} />);
    expect(html).toContain('crossorigin="anonymous"');
    expect(html).toContain('http://localhost:3000/media/avatars/user/file.webp');
  });

  it('preserves the Google avatar fallback', () => {
    const html = renderToString(<UserAvatar user={{ name: 'Ana', avatar: { type: 'google', presetId: null, url: 'https://lh3.googleusercontent.com/avatar' } }} />);
    expect(html).toContain('https://lh3.googleusercontent.com/avatar');
    expect(html).toContain('referrerPolicy="no-referrer"');
  });
});
