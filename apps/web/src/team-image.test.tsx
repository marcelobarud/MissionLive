/* @vitest-environment jsdom */
import { renderToString } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import { TeamImage } from './team-image';

describe('team images', () => {
  it('falls back to team initials and identity icon without an image', () => {
    const html = renderToString(<TeamImage team={{ name: 'Equipe MissionLive', imageUrl: null }} />);
    expect(html).toContain('EM');
    expect(html).toContain('Imagem da equipe Equipe MissionLive');
  });

  it('loads a persisted relative image through the API boundary', () => {
    const html = renderToString(<TeamImage team={{ name: 'Equipe MissionLive', imageUrl: '/teams/team-id/image' }} />);
    expect(html).toContain('http://localhost:3000/teams/team-id/image');
    expect(html).toContain('crossorigin="use-credentials"');
  });

  it('exposes the contextual edit action with an accessible tooltip', () => {
    const html = renderToString(<TeamImage team={{ name: 'Equipe MissionLive', imageUrl: null }} editable onEdit={() => undefined} />);
    expect(html).toContain('Editar imagem da equipe');
    expect(html).toContain('data-tooltip="Editar imagem"');
  });
});
