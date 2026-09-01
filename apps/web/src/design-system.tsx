import type { ButtonHTMLAttributes, HTMLAttributes, InputHTMLAttributes, ReactNode, SelectHTMLAttributes, TextareaHTMLAttributes } from 'react';
import type { TablerIcon } from '@tabler/icons-react';
import { IconInbox } from '@tabler/icons-react';

type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & { variant?: 'primary' | 'secondary' | 'danger' | 'ghost'; children: ReactNode; startIcon?: ReactNode; endIcon?: ReactNode };

export function Button({ variant = 'primary', className = '', children, startIcon, endIcon, ...props }: ButtonProps) {
  return <button className={`ds-button ds-button-${variant} ${className}`.trim()} {...props}>{startIcon && <span className="ds-button-icon" aria-hidden="true">{startIcon}</span>}{children}{endIcon && <span className="ds-button-icon" aria-hidden="true">{endIcon}</span>}</button>;
}

export function AppIcon({ icon: Icon, size = 20, stroke = 1.9, className = '', ...props }: { icon: TablerIcon; size?: number; stroke?: number; className?: string; 'aria-label'?: string; 'aria-hidden'?: boolean }) {
  return <Icon size={size} stroke={stroke} className={className || undefined} aria-hidden={props['aria-label'] ? undefined : props['aria-hidden'] ?? true} {...props} />;
}

export function IconButton({ className = '', children, ...props }: ButtonHTMLAttributes<HTMLButtonElement> & { 'aria-label': string }) {
  return <button className={`ds-icon-button ${className}`.trim()} {...props}>{children}</button>;
}

export function Input({ className = '', ...props }: InputHTMLAttributes<HTMLInputElement>) {
  return <input className={`ds-input ${className}`.trim()} {...props} />;
}

export function Textarea({ className = '', ...props }: TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return <textarea className={`ds-textarea ${className}`.trim()} {...props} />;
}

export function Select({ className = '', children, ...props }: SelectHTMLAttributes<HTMLSelectElement>) {
  return <select className={`ds-select ${className}`.trim()} {...props}>{children}</select>;
}

export function Checkbox({ className = '', ...props }: InputHTMLAttributes<HTMLInputElement>) {
  return <input type="checkbox" className={`ds-checkbox ${className}`.trim()} {...props} />;
}

export function FormField({ label, hint, error, children, className = '' }: { label: string; hint?: string; error?: string; children: ReactNode; className?: string }) {
  return <label className={`ds-form-field ${className}`.trim()}><span>{label}</span>{children}{hint && <small>{hint}</small>}{error && <small className="form-error" role="alert">{error}</small>}</label>;
}

export function Panel({ className = '', children, ...props }: HTMLAttributes<HTMLDivElement>) {
  return <div className={`ds-panel ${className}`.trim()} {...props}>{children}</div>;
}

export function Card({ className = '', children, ...props }: HTMLAttributes<HTMLElement>) {
  return <article className={`ds-card ${className}`.trim()} {...props}>{children}</article>;
}

export function Section({ className = '', children, ...props }: HTMLAttributes<HTMLElement>) {
  return <section className={`ds-section ${className}`.trim()} {...props}>{children}</section>;
}

export function PageHeader({ eyebrow, title, description, action, className = '' }: { eyebrow?: string; title: string; description?: string; action?: ReactNode; className?: string }) {
  return <header className={`ds-page-header ${className}`.trim()}><div>{eyebrow && <p className="eyebrow">{eyebrow}</p>}<h1>{title}</h1>{description && <p className="muted">{description}</p>}</div>{action}</header>;
}

export function EmptyState({ title, description, action, icon: Icon = IconInbox, className = '' }: { title: string; description: string; action?: ReactNode; icon?: TablerIcon; className?: string }) {
  return <div className={`ds-empty-state ${className}`.trim()}><div className="ds-empty-icon" aria-hidden="true"><Icon size={38} stroke={1.8} /></div><h2>{title}</h2><p>{description}</p>{action}</div>;
}

export function Spinner() { return <span className="ds-spinner" aria-label="Carregando" role="status" />; }

export function ProgressBar({ value }: { value: number }) { return <div className="ds-progress" role="progressbar" aria-valuemin={0} aria-valuemax={100} aria-valuenow={value} aria-label={`${value}% concluído`}><span style={{ width: `${Math.max(0, Math.min(100, value))}%` }} /></div>; }

export function Badge({ children, tone = 'neutral' }: { children: ReactNode; tone?: 'neutral' | 'primary' | 'success' | 'warning' | 'danger' }) { return <span className={`ds-badge ds-badge-${tone}`}>{children}</span>; }
