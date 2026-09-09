/* @vitest-environment jsdom */
import { cleanup, fireEvent, render, waitFor } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { GoalGallery } from './goal-gallery';
import { api } from './api';
import type { Goal } from './api';

const goal = { id: 'goal-a', status: 'active', steps: [{ id: 'step-a', title: 'Registrar avanço', position: 0, assignmentMode: 'ALL_PARTICIPANTS', applicable: true, assigneeAvailable: true }] } as Goal;
const photo = { id: 'photo-a', title: 'Primeiro marco', description: 'Um avanço importante.', author: { id: 'user-a', name: 'Pessoa A', avatarUrl: null }, task: { id: 'step-a', title: 'Registrar avanço' }, createdAt: '2026-09-09T12:00:00.000Z', thumbnailUrl: '/goals/goal-a/photos/photo-a/thumbnail', imageUrl: '/goals/goal-a/photos/photo-a/image', canDelete: true };

afterEach(() => { cleanup(); vi.restoreAllMocks(); });

describe('GoalGallery', () => {
  it('loads a paginated thumbnail grid and opens the accessible detail dialog', async () => {
    vi.spyOn(api, 'goalPhotos').mockResolvedValue({ items: [photo], nextOffset: null, hasMore: false });
    const view = render(<GoalGallery goal={goal} />);
    await waitFor(() => expect(view.getByAltText('Primeiro marco')).toBeTruthy());
    expect(view.getByAltText('Primeiro marco').getAttribute('loading')).toBe('lazy');
    fireEvent.click(view.getByRole('button', { name: /Primeiro marco/ }));
    expect(view.getByRole('dialog')).toBeTruthy();
    expect(view.getByText('Um avanço importante.')).toBeTruthy();
  });

  it('opens the add dialog with ordered fields and valid task options', async () => {
    vi.spyOn(api, 'goalPhotos').mockResolvedValue({ items: [], nextOffset: null, hasMore: false });
    const view = render(<GoalGallery goal={goal} />);
    await waitFor(() => expect(view.getByText('Ainda não há fotos')).toBeTruthy());
    fireEvent.click(view.getAllByRole('button', { name: 'Adicionar foto' })[0]);
    const dialog = view.getByRole('dialog', { name: 'Adicionar foto' });
    expect(dialog).toBeTruthy();
    expect(dialog.querySelector('input[type="file"]')).toBeTruthy();
    expect(view.getByRole('textbox', { name: 'Título' })).toBeTruthy();
    expect(view.getByRole('textbox', { name: 'Descrição' })).toBeTruthy();
    expect(view.getByRole('option', { name: 'Registrar avanço' })).toBeTruthy();
  });
});
