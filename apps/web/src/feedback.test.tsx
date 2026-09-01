/* @vitest-environment jsdom */
import '@testing-library/jest-dom/vitest';
import { act, cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { FeedbackBanner, FeedbackProvider, useFeedback } from './feedback';

function Harness() {
  const { confirm, prompt, toast } = useFeedback();
  return <div><button type="button" onClick={() => { void confirm({ title: 'Confirmar ação', description: 'Descrição da ação.' }).then((accepted) => { document.body.dataset.confirmed = String(accepted); }); }}>Abrir confirmação</button><button type="button" onClick={() => { void prompt({ title: 'Informar dados', fields: [{ name: 'value', label: 'Valor', required: true }] }).then((values) => { document.body.dataset.prompt = values?.value ?? 'cancelado'; }); }}>Abrir prompt</button><button type="button" onClick={() => toast({ title: 'Salvo com sucesso.', tone: 'success' })}>Mostrar toast</button></div>;
}

function AsyncHarness() {
  const { confirm, prompt } = useFeedback();
  return <div><button type="button" onClick={() => { void confirm({ title: 'Ação remota', onConfirm: async () => { document.body.dataset.calls = String(Number(document.body.dataset.calls ?? '0') + 1); await Promise.resolve(); throw new Error('Falha remota.'); } }); }}>Abrir ação remota</button><button type="button" onClick={() => { void prompt({ title: 'Envio remoto', fields: [{ name: 'value', label: 'Valor' }], submit: async () => { await Promise.resolve(); throw new Error('Não foi possível enviar.'); } }); }}>Abrir envio remoto</button></div>;
}

describe('feedback primitives', () => {
  afterEach(() => {
    cleanup();
    document.body.dataset.confirmed = '';
    document.body.dataset.prompt = '';
    document.body.dataset.calls = '';
    vi.useRealTimers();
  });

  it('abre confirmação, mantém foco, fecha por ESC e restaura o foco', async () => {
    render(<FeedbackProvider><Harness /></FeedbackProvider>);
    const trigger = screen.getByRole('button', { name: 'Abrir confirmação' });
    trigger.focus();
    fireEvent.click(trigger);
    expect(screen.getByRole('dialog', { name: 'Confirmar ação' })).toBeInTheDocument();
    await waitFor(() => expect(document.activeElement).toHaveTextContent('Cancelar'));
    fireEvent.keyDown(document, { key: 'Escape' });
    await act(async () => {});
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    expect(document.activeElement).toBe(trigger);
    expect(document.body.dataset.confirmed).toBe('false');
  });

  it('resolve confirmação e prompt com ações explícitas e mostra erro inline', async () => {
    render(<FeedbackProvider><Harness /></FeedbackProvider>);
    fireEvent.click(screen.getByRole('button', { name: 'Abrir confirmação' }));
    fireEvent.click(screen.getByRole('button', { name: 'Confirmar' }));
    await act(async () => {});
    expect(document.body.dataset.confirmed).toBe('true');

    fireEvent.click(screen.getByRole('button', { name: 'Abrir prompt' }));
    fireEvent.submit(screen.getByRole('button', { name: 'Salvar' }).closest('form')!);
    expect(screen.getByRole('alert')).toHaveTextContent('Informe valor.');
    fireEvent.change(screen.getByLabelText('Valor'), { target: { value: 'mission' } });
    fireEvent.submit(screen.getByRole('button', { name: 'Salvar' }).closest('form')!);
    await act(async () => {});
    expect(document.body.dataset.prompt).toBe('mission');
  });

  it('renderiza toast com ARIA e expira automaticamente', () => {
    vi.useFakeTimers();
    render(<FeedbackProvider><Harness /></FeedbackProvider>);
    fireEvent.click(screen.getByRole('button', { name: 'Mostrar toast' }));
    expect(screen.getByRole('status')).toHaveTextContent('Salvo com sucesso.');
    act(() => { vi.advanceTimersByTime(4500); });
    expect(screen.queryByText('Salvo com sucesso.')).not.toBeInTheDocument();
  });

  it('mantém dialog assíncrono aberto, bloqueia reenvio e mostra erro inline', async () => {
    render(<FeedbackProvider><AsyncHarness /></FeedbackProvider>);
    fireEvent.click(screen.getByRole('button', { name: 'Abrir ação remota' }));
    const confirmButton = screen.getByRole('button', { name: 'Confirmar' });
    fireEvent.click(confirmButton);
    expect(screen.getByRole('button', { name: 'Processando…' })).toBeDisabled();
    fireEvent.click(confirmButton);
    await waitFor(() => expect(screen.getByRole('alert')).toHaveTextContent('Falha remota.'));
    expect(document.body.dataset.calls).toBe('1');
    expect(screen.getByRole('dialog', { name: 'Ação remota' })).toBeInTheDocument();
  });

  it('expõe banner persistente com papel semântico', () => {
    render(<FeedbackBanner tone="danger" title="Falha ao salvar" description="Tente novamente." />);
    expect(screen.getByRole('alert')).toHaveTextContent('Falha ao salvar');
    expect(screen.getByRole('alert')).toHaveTextContent('Tente novamente.');
  });
});
