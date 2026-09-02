/* @vitest-environment jsdom */
import { cleanup, fireEvent, render } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { GoalStepsBuilder, sanitizeGoalStepDrafts, toGoalStepDrafts, type GoalStepDraft } from './goal-steps-builder';
import { useState } from 'react';

function Harness({ initial }: { initial: GoalStepDraft[] }) {
  const [steps, setSteps] = useState(initial);
  return <GoalStepsBuilder value={steps} onChange={setSteps} />;
}

describe('GoalStepsBuilder', () => {
  afterEach(() => cleanup());

  it('adds a focused next step with Enter and keeps the position-derived numbering', () => {
    const initial = toGoalStepDrafts([{ id: 'step-a', title: 'Planejar', position: 0 }]);
    const { getByLabelText, getAllByRole } = render(<Harness initial={initial} />);
    const first = getByLabelText('Título do passo 1') as HTMLInputElement;
    fireEvent.change(first, { target: { value: 'Planejar melhor' } });
    fireEvent.keyDown(first, { key: 'Enter' });
    expect(getAllByRole('listitem')).toHaveLength(2);
    expect(document.activeElement).toBe(getByLabelText('Título do passo 2'));
    expect((getByLabelText('Título do passo 1') as HTMLInputElement).value).toBe('Planejar melhor');
  });

  it('moves, removes, and confirms that empty drafts are never serialized', () => {
    const initial = toGoalStepDrafts([
      { id: 'step-a', title: 'Primeiro', position: 0 },
      { id: 'step-b', title: 'Segundo', position: 1 },
    ]);
    const { getByRole, getByLabelText } = render(<Harness initial={initial} />);
    fireEvent.click(getByRole('button', { name: 'Mover passo 1 para baixo' }));
    expect((getByLabelText('Título do passo 1') as HTMLInputElement).value).toBe('Segundo');
    fireEvent.click(getByRole('button', { name: 'Remover passo 2' }));
    expect(getByRole('listitem')).toBeTruthy();
    expect(sanitizeGoalStepDrafts([{ draftId: 'empty', title: '  ', position: 0 }, { draftId: 'ok', title: '  Fechar  ', position: 1 }])).toMatchObject([{ title: 'Fechar', position: 0 }]);
  });

  it('removes an existing step only after the caller confirms', async () => {
    const initial = toGoalStepDrafts([{ id: 'step-a', title: 'Confirmar', position: 0 }]);
    const onChange = vi.fn();
    const confirmRemove = vi.fn().mockResolvedValue(false);
    const { getByRole } = render(<GoalStepsBuilder value={initial} onChange={onChange} confirmRemove={confirmRemove} />);
    fireEvent.click(getByRole('button', { name: 'Remover passo 1' }));
    await vi.waitFor(() => expect(confirmRemove).toHaveBeenCalledOnce());
    expect(onChange).not.toHaveBeenCalled();
  });
});
