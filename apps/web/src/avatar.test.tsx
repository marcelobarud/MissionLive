/* @vitest-environment jsdom */
import { renderToString } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import { AVATAR_PRESETS, UserAvatar, avatarInitials } from './avatar';

describe('user avatars', () => {
  it('defines ten stable presets and falls back to initials', () => {
    expect(AVATAR_PRESETS).toHaveLength(10); expect(new Set(AVATAR_PRESETS.map((item) => item.id)).size).toBe(10); expect(avatarInitials('Ana Souza')).toBe('AS');
    expect(renderToString(<UserAvatar user={{ name: 'Ana Souza' }} />)).toContain('AS');
  });

  it('renders the selected preset without exposing a file path', () => {
    const html = renderToString(<UserAvatar user={{ name: 'Ana', avatar: { type: 'preset', presetId: 'avatar-03', url: null } }} size="lg" />);
    expect(html).toContain('user-avatar-lg'); expect(html).not.toContain('avatarFileKey');
  });

  it('loads uploaded avatars through the API CORS boundary', () => {
    const html = renderToString(<UserAvatar user={{ name: 'Ana', avatar: { type: 'upload', presetId: null, url: '/media/avatars/user/file.webp' } }} />);
    expect(html).toContain('crossorigin="anonymous"');
    expect(html).toContain('http://localhost:3000/media/avatars/user/file.webp');
  });
});
