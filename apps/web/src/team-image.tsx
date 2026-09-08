import { ChangeEvent, useEffect, useId, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { IconCamera, IconPhoto, IconPencil, IconTrash, IconUpload, IconUsersGroup, IconX } from '@tabler/icons-react';
import { api, API_URL, Team, TeamDetail } from './api';
import { useFeedback } from './feedback';

const IMAGE_TYPES = ['image/jpeg', 'image/png', 'image/webp'];
const MAX_IMAGE_BYTES = 5 * 1024 * 1024;

function mediaUrl(url?: string | null) { return url?.startsWith('/') ? `${API_URL}${url}` : url ?? undefined; }
function initials(name: string) { return name.split(/\s+/).filter(Boolean).slice(0, 2).map((part) => part[0]?.toUpperCase()).join('') || '?'; }

export function TeamImage({ team, size = 'md', decorative = false, srcOverride, className = '', editable = false, onEdit }: { team: Pick<Team, 'name' | 'imageUrl'>; size?: 'sm' | 'md' | 'lg' | 'xl'; decorative?: boolean; srcOverride?: string; className?: string; editable?: boolean; onEdit?: () => void }) {
  const [broken, setBroken] = useState(false);
  const source = srcOverride ?? mediaUrl(team.imageUrl);
  useEffect(() => setBroken(false), [source]);
  const label = decorative ? undefined : `Imagem da equipe ${team.name}`;
  const classes = `team-image team-image-${size}`;
  const dimension = { sm: 44, md: 64, lg: 88, xl: 104 }[size];
  const content = source && !broken
    ? <img className={classes} width={dimension} height={dimension} loading={size === 'xl' ? 'eager' : 'lazy'} src={source} alt={label ?? ''} aria-hidden={decorative} onError={() => setBroken(true)} />
    : <span className={`${classes} team-image-fallback`} aria-label={label} aria-hidden={decorative}><span>{initials(team.name)}</span><IconUsersGroup size={size === 'xl' ? 24 : size === 'lg' ? 19 : 15} stroke={1.7} aria-hidden="true" /></span>;
  return <span className={`team-image-shell team-image-shell-${size}${className ? ` ${className}` : ''}`}>{content}{editable && <button className="team-image-edit" type="button" aria-label="Editar imagem da equipe" title="Editar imagem da equipe" data-tooltip="Editar imagem" onClick={() => onEdit?.()}><IconPencil size={18} stroke={2} aria-hidden="true" /></button>}</span>;
}
function validateImage(file: File) {
  if (!IMAGE_TYPES.includes(file.type)) return 'Escolha uma imagem JPEG, PNG ou WebP.';
  if (file.size > MAX_IMAGE_BYTES) return 'A imagem deve ter no máximo 5 MB.';
  return '';
}

export function TeamImagePicker({ onSelected }: { onSelected: (file: File | undefined) => void }) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [file, setFile] = useState<File>();
  const [preview, setPreview] = useState<string>();
  const [error, setError] = useState('');
  useEffect(() => () => { if (preview) URL.revokeObjectURL(preview); }, [preview]);
  function select(event: ChangeEvent<HTMLInputElement>) {
    const next = event.target.files?.[0]; event.target.value = ''; if (!next) return;
    const validation = validateImage(next); if (validation) { setError(validation); return; }
    if (preview) URL.revokeObjectURL(preview); const nextPreview = URL.createObjectURL(next); setFile(next); setPreview(nextPreview); setError(''); onSelected(next);
  }
  function clear() { if (preview) URL.revokeObjectURL(preview); setFile(undefined); setPreview(undefined); setError(''); onSelected(undefined); }
  const previewTeam = { name: 'Equipe', imageUrl: null } as Team;
  return <div className="team-image-picker"><div className="team-image-picker-preview">{preview ? <TeamImage team={previewTeam} size="lg" srcOverride={preview} /> : <TeamImage team={previewTeam} size="lg" decorative />}</div><div className="team-image-picker-copy"><strong>Imagem principal</strong><span>Uma foto de identidade para reconhecer a equipe. JPEG, PNG ou WebP de até 5 MB.</span><div className="team-image-picker-actions"><button className="button button-secondary" type="button" onClick={() => inputRef.current?.click()}><IconUpload size={17} aria-hidden="true" />{file ? 'Escolher outra' : 'Escolher imagem'}</button>{file && <button className="text-button" type="button" onClick={clear}>Cancelar</button>}</div>{error && <p className="form-error" role="alert">{error}</p>}</div><input ref={inputRef} className="visually-hidden" aria-label="Escolher imagem da equipe" type="file" accept="image/jpeg,image/png,image/webp" onChange={select} /></div>;
}

export function TeamImageManager({ team, onUpdated, onClose }: { team: TeamDetail; onUpdated: (team: TeamDetail) => void; onClose: () => void }) {
  const inputRef = useRef<HTMLInputElement>(null);
  const dialogRef = useRef<HTMLElement>(null);
  const previousFocus = useRef<HTMLElement | null>(null);
  const onCloseRef = useRef(onClose);
  const titleId = useId();
  const descriptionId = useId();
  const [file, setFile] = useState<File>();
  const [preview, setPreview] = useState<string>();
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);
  const { confirm, toast } = useFeedback();
  useEffect(() => { onCloseRef.current = onClose; }, [onClose]);
  useEffect(() => {
    previousFocus.current = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    const frame = window.requestAnimationFrame(() => dialogRef.current?.querySelector<HTMLElement>('[data-dialog-initial-focus]')?.focus());
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') { event.preventDefault(); onCloseRef.current(); return; }
      if (event.key !== 'Tab' || !dialogRef.current) return;
      const focusable = [...dialogRef.current.querySelectorAll<HTMLElement>('button, input, textarea, select, [href], [tabindex]:not([tabindex="-1"])')]
        .filter((element) => !element.hasAttribute('disabled') && element.getAttribute('aria-hidden') !== 'true');
      if (!focusable.length) return;
      const first = focusable[0]; const last = focusable[focusable.length - 1];
      if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last.focus(); }
      else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first.focus(); }
    };
    document.addEventListener('keydown', handleKeyDown);
    const originalOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => { window.cancelAnimationFrame(frame); document.removeEventListener('keydown', handleKeyDown); document.body.style.overflow = originalOverflow; previousFocus.current?.focus(); };
  }, []);
  useEffect(() => () => { if (preview) URL.revokeObjectURL(preview); }, [preview]);
  function select(event: ChangeEvent<HTMLInputElement>) {
    const next = event.target.files?.[0]; event.target.value = ''; if (!next) return;
    const validation = validateImage(next); if (validation) { setError(validation); return; }
    if (preview) URL.revokeObjectURL(preview); setFile(next); setPreview(URL.createObjectURL(next)); setError('');
  }
  async function save() {
    if (!file) return; setSaving(true); setError('');
    try { onUpdated(await api.uploadTeamImage(team.id, file)); setFile(undefined); if (preview) URL.revokeObjectURL(preview); setPreview(undefined); toast({ title: 'Imagem da equipe atualizada.', tone: 'success' }); onClose(); }
    catch (err) { setError(err instanceof Error ? err.message : 'Não foi possível salvar a imagem.'); }
    finally { setSaving(false); }
  }
  async function remove() { await confirm({ title: 'Remover imagem da equipe?', description: 'A equipe voltará a usar o fallback com iniciais.', tone: 'danger', confirmLabel: 'Remover imagem', onConfirm: async () => { onUpdated(await api.removeTeamImage(team.id)); toast({ title: 'Imagem removida.', tone: 'success' }); onClose(); } }); }
  return createPortal(<div className="team-image-dialog-backdrop" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget) onClose(); }}><section className="panel team-image-manager" ref={dialogRef} role="dialog" aria-modal="true" aria-labelledby={titleId} aria-describedby={descriptionId}><div className="team-image-manager-header"><div className="team-image-manager-preview"><TeamImage team={team} size="xl" srcOverride={preview} /><div className="team-image-manager-copy"><p className="eyebrow">IDENTIDADE DA EQUIPE</p><h2 id={titleId}>Imagem principal</h2><p id={descriptionId} className="muted">Use uma foto quadrada para reconhecer a equipe com rapidez.</p></div></div><button className="team-image-manager-close" type="button" aria-label="Fechar edição da imagem" title="Fechar edição" data-dialog-initial-focus onClick={onClose}><IconX size={18} aria-hidden="true" /></button></div><div className="team-image-manager-actions"><button className="button button-secondary" type="button" onClick={() => inputRef.current?.click()}><IconCamera size={17} aria-hidden="true" />{preview ? 'Escolher outra' : team.imageUrl ? 'Alterar imagem' : 'Escolher imagem'}</button>{preview && <><button className="button button-primary" type="button" disabled={saving} onClick={() => { void save(); }}>{saving ? 'Salvando…' : 'Salvar imagem'}</button><button className="text-button" type="button" disabled={saving} onClick={() => { if (preview) URL.revokeObjectURL(preview); setFile(undefined); setPreview(undefined); }}>Cancelar</button></>}{team.imageUrl && !preview && <button className="text-button danger-button" type="button" onClick={() => { void remove(); }}><IconTrash size={16} aria-hidden="true" />Remover</button>}</div>{error && <p className="form-error" role="alert">{error}</p>}<p className="team-image-manager-hint"><IconPhoto size={15} aria-hidden="true" />JPEG, PNG ou WebP · até 5 MB</p><input ref={inputRef} className="visually-hidden" aria-label="Escolher imagem da equipe" type="file" accept="image/jpeg,image/png,image/webp" onChange={select} /></section></div>, document.body);
}
