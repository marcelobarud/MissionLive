import type { ButtonHTMLAttributes, HTMLAttributes, ReactNode } from 'react';

export function Button({ variant = 'primary', className = '', children, ...props }: ButtonHTMLAttributes<HTMLButtonElement> & { variant?: 'primary' | 'secondary' | 'danger' | 'ghost'; children: ReactNode }) {
  return <button className={`ds-button ds-button-${variant} ${className}`.trim()} {...props}>{children}</button>;
}

export function Panel({ className = '', children, ...props }: HTMLAttributes<HTMLDivElement>) {
  return <div className={`ds-panel ${className}`.trim()} {...props}>{children}</div>;
}

export function PageHeader({ eyebrow, title, description, action, className = '' }: { eyebrow?: string; title: string; description?: string; action?: ReactNode; className?: string }) {
  return <header className={`ds-page-header ${className}`.trim()}><div>{eyebrow && <p className="eyebrow">{eyebrow}</p>}<h1>{title}</h1>{description && <p className="muted">{description}</p>}</div>{action}</header>;
}

export function EmptyState({ title, description, action, className = '' }: { title: string; description: string; action?: ReactNode; className?: string }) {
  return <div className={`ds-empty-state ${className}`.trim()}><div className="ds-empty-icon" aria-hidden="true">◎</div><h2>{title}</h2><p>{description}</p>{action}</div>;
}

export function Spinner() { return <span className="ds-spinner" aria-label="Carregando" role="status" />; }

export function ProgressBar({ value }: { value: number }) { return <div className="ds-progress" role="progressbar" aria-valuemin={0} aria-valuemax={100} aria-valuenow={value} aria-label={`${value}% concluído`}><span style={{ width: `${Math.max(0, Math.min(100, value))}%` }} /></div>; }

export function Badge({ children, tone = 'neutral' }: { children: ReactNode; tone?: 'neutral' | 'primary' | 'success' | 'warning' | 'danger' }) { return <span className={`ds-badge ds-badge-${tone}`}>{children}</span>; }
