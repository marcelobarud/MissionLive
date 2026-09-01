import { renderToString } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import { MissionLiveWelcome } from './app';

describe('MissionLive shell', () => {
  it('renders the welcome message', () => {
    expect(renderToString(<MissionLiveWelcome />)).toContain('Suas metas, em movimento.');
  });
});
