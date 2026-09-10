import { createContext, FormEvent, ReactNode, useCallback, useContext, useEffect, useId, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { IconAlertTriangle, IconCheck, IconInfoCircle, IconX } from '@tabler/icons-react';
import { Button, IconButton, Input, Select, Textarea } from './design-system';

export type FeedbackTone = 'success' | 'warning' | 'danger' | 'info';

export type DialogField = {
  name: string;
  label: string;
  type?: 'text' | 'date' | 'textarea' | 'select';
  options?: { value: string; label: string }[];
  defaultValue?: string;
  placeholder?: string;
  required?: boolean;
  minLength?: number;
  maxLength?: number;
};

type DialogOptions = {
  title: string;
  description?: string;
  tone?: FeedbackTone;
  confirmLabel?: string;
  cancelLabel?: string;
  onConfirm?: () => Promise<void>;
};

type PromptOptions = DialogOptions & {
  fields: DialogField[];
  submit?: (values: Record<string, string>) => Promise<void>;
};

type ConfirmRequest = { kind: 'confirm'; options: DialogOptions };
type PromptRequest = { kind: 'prompt'; options: PromptOptions };
type DialogRequest = ConfirmRequest | PromptRequest;

type ToastInput = {
  title: string;
  description?: string;
  tone?: FeedbackTone;
  duration?: number;
};

type ToastItem = ToastInput & { id: number };

type FeedbackContextValue = {
  confirm: (options: DialogOptions) => Promise<boolean>;
  prompt: (options: PromptOptions) => Promise<Record<string, string> | null>;
  toast: (input: ToastInput) => void;
};

const FeedbackContext = createContext<FeedbackContextValue | null>(null);

function dialogIcon(tone: FeedbackTone) {
  if (tone === 'success') return <IconCheck size={22} stroke={1.9} aria-hidden="true" />;
  if (tone === 'warning' || tone === 'danger') return <IconAlertTriangle size={22} stroke={1.9} aria-hidden="true" />;
  return <IconInfoCircle size={22} stroke={1.9} aria-hidden="true" />;
}

function feedbackError(error: unknown, fallback: string) {
  return error instanceof Error && error.message ? error.message : fallback;
}

function DialogShell({ title, description, tone = 'info', className, children, onClose }: { title: string; description?: string; tone?: FeedbackTone; className?: string; children: ReactNode; onClose: () => void }) {
  const titleId = useId();
  const descriptionId = useId();
  const dialogRef = useRef<HTMLDivElement>(null);
  const previousFocus = useRef<HTMLElement | null>(null);
  const onCloseRef = useRef(onClose);

  useEffect(() => {
    onCloseRef.current = onClose;
  }, [onClose]);

  useEffect(() => {
    previousFocus.current = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    const frame = window.requestAnimationFrame(() => {
      const target = dialogRef.current?.querySelector<HTMLElement>('[data-dialog-initial-focus]')
        ?? dialogRef.current?.querySelector<HTMLElement>('button, input, textarea, select, [href]');
      target?.focus();
    });
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        event.preventDefault();
        onCloseRef.current();
        return;
      }
      if (event.key !== 'Tab' || !dialogRef.current) return;
      const focusable = [...dialogRef.current.querySelectorAll<HTMLElement>('button, input, textarea, select, [href], [tabindex]:not([tabindex="-1"])')]
        .filter((element) => !element.hasAttribute('disabled') && element.getAttribute('aria-hidden') !== 'true');
      if (!focusable.length) return;
      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    };
    document.addEventListener('keydown', handleKeyDown);
    const originalOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      window.cancelAnimationFrame(frame);
      document.removeEventListener('keydown', handleKeyDown);
      document.body.style.overflow = originalOverflow;
      previousFocus.current?.focus();
    };
  }, []);

  return createPortal(<div className="feedback-backdrop" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget) onClose(); }}><div className={className ? `ds-dialog ${className}` : 'ds-dialog'} ref={dialogRef} role="dialog" aria-modal="true" aria-labelledby={titleId} aria-describedby={description ? descriptionId : undefined}><div className={`feedback-dialog-icon feedback-dialog-icon-${tone}`}>{dialogIcon(tone)}</div><div className="ds-dialog-content"><h2 id={titleId}>{title}</h2>{description && <p id={descriptionId}>{description}</p>}{children}</div></div></div>, document.body);
}

export function Dialog({ open, title, description, tone = 'info', className, onClose, children }: { open: boolean; title: string; description?: string; tone?: FeedbackTone; className?: string; onClose: () => void; children: ReactNode }) {
  if (!open) return null;
  return <DialogShell title={title} description={description} tone={tone} className={className} onClose={onClose}>{children}</DialogShell>;
}

export function ConfirmDialog({ open, options, onCancel, onConfirm }: { open: boolean; options: DialogOptions; onCancel: () => void; onConfirm: () => Promise<void> }) {
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  async function handleConfirm() {
    if (submitting) return;
    setSubmitting(true);
    setError('');
    try { await onConfirm(); } catch (err) { setError(feedbackError(err, 'Não foi possível concluir esta ação.')); } finally { setSubmitting(false); }
  }
  return <Dialog open={open} title={options.title} description={options.description} tone={options.tone} onClose={submitting ? () => undefined : onCancel}><div className="ds-dialog-actions"><Button variant="ghost" type="button" onClick={onCancel} disabled={submitting} data-dialog-initial-focus>{options.cancelLabel ?? 'Cancelar'}</Button><Button variant={options.tone === 'danger' ? 'danger' : 'primary'} type="button" onClick={() => { void handleConfirm(); }} disabled={submitting} aria-busy={submitting}>{submitting ? 'Processando…' : options.confirmLabel ?? 'Confirmar'}</Button></div>{error && <p className="form-error" role="alert">{error}</p>}</Dialog>;
}

export function PromptDialog({ open, options, onCancel, onSubmit }: { open: boolean; options: PromptOptions; onCancel: () => void; onSubmit: (values: Record<string, string>) => Promise<void> }) {
  const [values, setValues] = useState<Record<string, string>>(() => Object.fromEntries(options.fields.map((field) => [field.name, field.defaultValue ?? ''])));
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (submitting) return;
    const invalid = options.fields.find((field) => field.required && !values[field.name]?.trim());
    if (invalid) {
      setError(`Informe ${invalid.label.toLocaleLowerCase()}.`);
      return;
    }
    setError('');
    setSubmitting(true);
    try { await onSubmit(values); } catch (err) { setError(feedbackError(err, 'Não foi possível concluir esta ação.')); } finally { setSubmitting(false); }
  };
  return <Dialog open={open} title={options.title} description={options.description} tone={options.tone} onClose={submitting ? () => undefined : onCancel}><form className="feedback-prompt-form" onSubmit={(event) => { void handleSubmit(event); }} aria-busy={submitting}>{options.fields.map((field, index) => <label className="ds-form-field" key={field.name}><span>{field.label}</span>{field.type === 'textarea' ? <Textarea name={field.name} autoComplete="off" value={values[field.name] ?? ''} onChange={(event) => setValues((current) => ({ ...current, [field.name]: event.target.value }))} placeholder={field.placeholder} required={field.required} minLength={field.minLength} maxLength={field.maxLength} disabled={submitting} data-dialog-initial-focus={index === 0 ? true : undefined} /> : field.type === 'select' ? <Select name={field.name} autoComplete="off" value={values[field.name] ?? ''} onChange={(event) => setValues((current) => ({ ...current, [field.name]: event.target.value }))} required={field.required} disabled={submitting} data-dialog-initial-focus={index === 0 ? true : undefined}>{field.options?.map((option) => <option value={option.value} key={option.value}>{option.label}</option>)}</Select> : <Input name={field.name} autoComplete="off" type={field.type ?? 'text'} value={values[field.name] ?? ''} onChange={(event) => setValues((current) => ({ ...current, [field.name]: event.target.value }))} placeholder={field.placeholder} required={field.required} minLength={field.minLength} maxLength={field.maxLength} disabled={submitting} data-dialog-initial-focus={index === 0 ? true : undefined} />}</label>)}{error && <p className="form-error" role="alert">{error}</p>}<div className="ds-dialog-actions"><Button variant="ghost" type="button" onClick={onCancel} disabled={submitting}>Cancelar</Button><Button variant={options.tone === 'danger' ? 'danger' : 'primary'} type="submit" disabled={submitting} aria-busy={submitting}>{submitting ? 'Processando…' : options.confirmLabel ?? 'Salvar'}</Button></div></form></Dialog>;
}

export function FeedbackBanner({ tone = 'info', title, description }: { tone?: FeedbackTone; title: string; description?: string }) {
  return <div className={`feedback-banner feedback-banner-${tone}`} role={tone === 'danger' ? 'alert' : 'status'}><span className="feedback-banner-icon">{dialogIcon(tone)}</span><div><strong>{title}</strong>{description && <p>{description}</p>}</div></div>;
}

export function Toast({ item, onDismiss }: { item: ToastItem; onDismiss: (id: number) => void }) {
  return <div className={`feedback-toast feedback-toast-${item.tone ?? 'info'}`} role={item.tone === 'danger' ? 'alert' : 'status'} aria-live={item.tone === 'danger' ? 'assertive' : 'polite'}><span className="feedback-toast-icon">{dialogIcon(item.tone ?? 'info')}</span><div><strong>{item.title}</strong>{item.description && <p>{item.description}</p>}</div><IconButton aria-label="Fechar aviso" type="button" onClick={() => onDismiss(item.id)}><IconX size={18} stroke={1.9} aria-hidden="true" /></IconButton></div>;
}

export function ToastViewport({ items, onDismiss }: { items: ToastItem[]; onDismiss: (id: number) => void }) {
  return <div className="feedback-toast-viewport" aria-label="Avisos" aria-live="polite">{items.map((item) => <Toast key={item.id} item={item} onDismiss={onDismiss} />)}</div>;
}

export function FeedbackProvider({ children }: { children: ReactNode }) {
  const [dialog, setDialog] = useState<DialogRequest | null>(null);
  const [toasts, setToasts] = useState<ToastItem[]>([]);
  const resolver = useRef<((value: unknown) => void) | null>(null);
  const nextToastId = useRef(0);

  const finishDialog = useCallback((value: unknown) => {
    resolver.current?.(value);
    resolver.current = null;
    setDialog(null);
  }, []);

  const confirm = useCallback((options: DialogOptions) => new Promise<boolean>((resolve) => {
    resolver.current = (value) => resolve(Boolean(value));
    setDialog({ kind: 'confirm', options });
  }), []);

  const prompt = useCallback((options: PromptOptions) => new Promise<Record<string, string> | null>((resolve) => {
    resolver.current = (value) => resolve((value as Record<string, string> | null) ?? null);
    setDialog({ kind: 'prompt', options });
  }), []);

  const toast = useCallback((input: ToastInput) => {
    const id = nextToastId.current++;
    setToasts((current) => [...current, { ...input, id }]);
  }, []);

  const dismissToast = useCallback((id: number) => setToasts((current) => current.filter((item) => item.id !== id)), []);

  useEffect(() => {
    const timers = toasts.map((item) => window.setTimeout(() => dismissToast(item.id), item.duration ?? 4500));
    return () => timers.forEach((timer) => window.clearTimeout(timer));
  }, [toasts, dismissToast]);

  return <FeedbackContext.Provider value={{ confirm, prompt, toast }}><>{children}</>{dialog?.kind === 'confirm' && <ConfirmDialog open options={dialog.options} onCancel={() => finishDialog(false)} onConfirm={async () => { await dialog.options.onConfirm?.(); finishDialog(true); }} />}{dialog?.kind === 'prompt' && <PromptDialog open options={dialog.options} onCancel={() => finishDialog(null)} onSubmit={async (values) => { await dialog.options.submit?.(values); finishDialog(values); }} />}<ToastViewport items={toasts} onDismiss={dismissToast} /></FeedbackContext.Provider>;
}

export function useFeedback() {
  const context = useContext(FeedbackContext);
  if (!context) throw new Error('useFeedback deve ser usado dentro de FeedbackProvider.');
  return context;
}

export function useOptionalFeedback() { return useContext(FeedbackContext); }
