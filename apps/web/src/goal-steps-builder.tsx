import { useCallback, useEffect, useRef, useState } from 'react';
import { IconArrowDown, IconArrowUp, IconGripVertical, IconPlus, IconTrash } from '@tabler/icons-react';

export type GoalStepDraft = {
  draftId: string;
  id?: string;
  title: string;
  description?: string | null;
  position: number;
  assignmentMode?: 'ALL_PARTICIPANTS' | 'SPECIFIC_PARTICIPANT';
  assigneeUserId?: string | null;
  assigneeName?: string | null;
};

export type StepParticipantOption = { id: string; name: string };

export function toGoalStepDrafts(steps: { id: string; title: string; description?: string | null; position: number; assignmentMode?: 'ALL_PARTICIPANTS' | 'SPECIFIC_PARTICIPANT'; assigneeUserId?: string | null; assigneeName?: string | null }[] = []): GoalStepDraft[] {
  return steps.map((step, index) => ({ draftId: step.id, id: step.id, title: step.title, description: step.description, position: index, assignmentMode: step.assignmentMode ?? 'ALL_PARTICIPANTS', assigneeUserId: step.assigneeUserId ?? null, assigneeName: step.assigneeName ?? null }));
}

export function sanitizeGoalStepDrafts(steps: GoalStepDraft[]) {
  return steps.filter((step) => step.title.trim()).map((step, index) => ({ ...step, title: step.title.trim(), position: index }));
}

type GoalStepsBuilderProps = {
  value: GoalStepDraft[];
  onChange: (steps: GoalStepDraft[]) => void;
  confirmRemove?: (step: GoalStepDraft) => Promise<boolean>;
  disabled?: boolean;
  participants?: StepParticipantOption[];
};

let nextDraftId = 0;

function normalize(steps: GoalStepDraft[]) {
  return steps.map((step, index) => ({ ...step, position: index }));
}

function createDraft(): GoalStepDraft {
  const draftId = `new-step-${Date.now()}-${nextDraftId++}`;
  return { draftId, title: '', position: 0 };
}

export function GoalStepsBuilder({ value, onChange, confirmRemove, disabled = false, participants = [] }: GoalStepsBuilderProps) {
  const [draggingId, setDraggingId] = useState<string>();
  const [dragMessage, setDragMessage] = useState('');
  const focusAfterAdd = useRef<string | undefined>(undefined);
  const inputRefs = useRef(new Map<string, HTMLInputElement>());

  useEffect(() => {
    if (!focusAfterAdd.current) return;
    const input = inputRefs.current.get(focusAfterAdd.current);
    input?.focus();
    focusAfterAdd.current = undefined;
  }, [value.length]);

  const reorder = useCallback((sourceId: string, targetId: string, insertAfter = false) => {
    const sourceIndex = value.findIndex((step) => step.draftId === sourceId);
    const targetIndex = value.findIndex((step) => step.draftId === targetId);
    if (sourceIndex < 0 || targetIndex < 0 || sourceIndex === targetIndex) return;
    const next = [...value];
    const [moved] = next.splice(sourceIndex, 1);
    if (!moved) return;
    let destination = next.findIndex((step) => step.draftId === targetId) + (insertAfter ? 1 : 0);
    if (destination < 0) destination = next.length;
    next.splice(destination, 0, moved);
    onChange(normalize(next));
  }, [onChange, value]);

  useEffect(() => {
    if (!draggingId) return;
    const activeDragId = draggingId;
    function handlePointerMove(event: PointerEvent) {
      const target = document.elementFromPoint(event.clientX, event.clientY)?.closest<HTMLElement>('[data-step-key]');
      const targetId = target?.dataset.stepKey;
      if (!targetId || targetId === activeDragId) return;
      const rect = target?.getBoundingClientRect();
      if (!rect) return;
      reorder(activeDragId, targetId, event.clientY > rect.top + rect.height / 2);
    }
    function handlePointerUp() {
      setDraggingId(undefined);
      setDragMessage('');
    }
    window.addEventListener('pointermove', handlePointerMove);
    window.addEventListener('pointerup', handlePointerUp);
    return () => {
      window.removeEventListener('pointermove', handlePointerMove);
      window.removeEventListener('pointerup', handlePointerUp);
    };
  }, [draggingId, reorder]);

  function addAfter(index: number) {
    const draft = createDraft();
    focusAfterAdd.current = draft.draftId;
    const next = [...value];
    next.splice(index + 1, 0, draft);
    onChange(normalize(next));
  }

  function addAtEnd() {
    const draft = createDraft();
    focusAfterAdd.current = draft.draftId;
    onChange(normalize([...value, draft]));
  }

  async function remove(step: GoalStepDraft) {
    if (step.id && confirmRemove && !await confirmRemove(step)) return;
    onChange(normalize(value.filter((current) => current.draftId !== step.draftId)));
  }

  return <section className="goal-steps-builder" aria-labelledby="goal-steps-builder-title">
    <div className="goal-steps-builder__header">
      <div>
        <h2 id="goal-steps-builder-title">Passos</h2>
        <p className="field-hint">Opcional · organize o checklist na ordem em que ele acontece.</p>
      </div>
      <span className="goal-steps-builder__count" aria-label={`${value.length} passos`}>{value.length}</span>
    </div>
    {value.length === 0 ? <div className="goal-steps-builder__empty"><p>Comece com um passo pequeno e concreto.</p><button className="button button-secondary" type="button" onClick={addAtEnd} disabled={disabled}><IconPlus size={17} stroke={1.9} aria-hidden="true" />Adicionar primeiro passo</button></div> : <ol className="goal-steps-builder__list" aria-label="Passos da meta">
      {value.map((step, index) => <li className={draggingId === step.draftId ? 'goal-step-builder__item is-dragging' : 'goal-step-builder__item'} data-step-key={step.draftId} key={step.draftId}>
        <span className="goal-step-builder__number" aria-hidden="true">{index + 1}</span>
        <div className="goal-step-builder__field"><label htmlFor={`goal-step-${step.draftId}`}>Título do passo {index + 1}</label><input id={`goal-step-${step.draftId}`} name={`goal-step-${step.draftId}`} autoComplete="off" ref={(input) => { if (input) inputRefs.current.set(step.draftId, input); else inputRefs.current.delete(step.draftId); }} value={step.title} onChange={(event) => onChange(normalize(value.map((current) => current.draftId === step.draftId ? { ...current, title: event.target.value } : current)))} onKeyDown={(event) => { if (event.key === 'Enter' && step.title.trim()) { event.preventDefault(); addAfter(index); } }} placeholder="Descreva uma ação…" maxLength={200} disabled={disabled} />{participants.length > 0 && <label className="goal-step-builder__assignee" htmlFor={`goal-step-assignee-${step.draftId}`}>Responsável<select id={`goal-step-assignee-${step.draftId}`} name={`goal-step-assignee-${step.draftId}`} value={step.assignmentMode === 'SPECIFIC_PARTICIPANT' ? (step.assigneeUserId ?? '__unavailable') : 'ALL_PARTICIPANTS'} onChange={(event) => { const valueSelected = event.target.value; onChange(normalize(value.map((current) => current.draftId === step.draftId ? valueSelected === 'ALL_PARTICIPANTS' ? { ...current, assignmentMode: 'ALL_PARTICIPANTS', assigneeUserId: null, assigneeName: null } : { ...current, assignmentMode: 'SPECIFIC_PARTICIPANT', assigneeUserId: valueSelected, assigneeName: participants.find((participant) => participant.id === valueSelected)?.name ?? current.assigneeName ?? null } : current))); }} disabled={disabled}><option value="ALL_PARTICIPANTS">Todos</option>{step.assignmentMode === 'SPECIFIC_PARTICIPANT' && step.assigneeUserId && !participants.some((participant) => participant.id === step.assigneeUserId) && <option value={step.assigneeUserId}>{step.assigneeName ? `${step.assigneeName} (indisponível)` : 'Responsável indisponível'}</option>}{participants.map((participant) => <option key={participant.id} value={participant.id}>{participant.name}</option>)}</select></label>}{!step.title.trim() && <small className="goal-step-builder__hint">Será ignorado se ficar vazio.</small>}</div>
        <button className="goal-step-builder__drag" type="button" aria-label={`Arrastar passo ${index + 1}`} onPointerDown={(event) => { if (disabled || !event.isPrimary) return; event.preventDefault(); setDraggingId(step.draftId); setDragMessage('Use o ponteiro para reposicionar este passo.'); }} disabled={disabled}><IconGripVertical size={18} stroke={1.8} aria-hidden="true" /></button>
        <div className="goal-step-builder__actions" aria-label={`Ações do passo ${index + 1}`}><button className="icon-button" type="button" aria-label={`Mover passo ${index + 1} para cima`} onClick={() => { if (index > 0) reorder(step.draftId, value[index - 1].draftId); }} disabled={disabled || index === 0}><IconArrowUp size={17} stroke={1.9} aria-hidden="true" /></button><button className="icon-button" type="button" aria-label={`Mover passo ${index + 1} para baixo`} onClick={() => { if (index < value.length - 1) reorder(step.draftId, value[index + 1].draftId, true); }} disabled={disabled || index === value.length - 1}><IconArrowDown size={17} stroke={1.9} aria-hidden="true" /></button><button className="icon-button goal-step-builder__remove" type="button" aria-label={`Remover passo ${index + 1}`} onClick={() => { void remove(step); }} disabled={disabled}><IconTrash size={17} stroke={1.9} aria-hidden="true" /></button></div>
      </li>)}
    </ol>}
    {dragMessage && <p className="goal-steps-builder__status" role="status">{dragMessage}</p>}
    {value.length > 0 && <button className="button button-secondary goal-steps-builder__add" type="button" onClick={addAtEnd} disabled={disabled}><IconPlus size={17} stroke={1.9} aria-hidden="true" />Adicionar passo</button>}
  </section>;
}
