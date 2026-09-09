import { ChangeEvent, useEffect, useId, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import Cropper, { Area } from 'react-easy-crop';
import { IconCamera, IconPhoto, IconTrash, IconUpload, IconX } from '@tabler/icons-react';
import { api, API_URL, Avatar, User } from './api';
import { useFeedback } from './feedback';
import { useDialogFocus } from './dialog-focus';

export const AVATAR_PRESETS = [
  { id: 'avatar-01', label: 'Samurai', imageSrc: '/avatars/presets/avatar-preset-01-samurai.png' },
  { id: 'avatar-02', label: 'Ninja', imageSrc: '/avatars/presets/avatar-preset-02-ninja.png' },
  { id: 'avatar-03', label: 'Cachorro', imageSrc: '/avatars/presets/avatar-preset-03-cachorro.png' },
  { id: 'avatar-04', label: 'Gato', imageSrc: '/avatars/presets/avatar-preset-04-gato.png' },
  { id: 'avatar-05', label: 'Sapo', imageSrc: '/avatars/presets/avatar-preset-05-sapo.png' },
  { id: 'avatar-06', label: 'Galo', imageSrc: '/avatars/presets/avatar-preset-06-galo.png' },
  { id: 'avatar-07', label: 'Corredor', imageSrc: '/avatars/presets/avatar-preset-07-corredor.png' },
  { id: 'avatar-08', label: 'Homem de terno', imageSrc: '/avatars/presets/avatar-preset-08-homem-terno.png' },
  { id: 'avatar-09', label: 'Mulher de terno', imageSrc: '/avatars/presets/avatar-preset-09-mulher-terno.png' },
  { id: 'avatar-10', label: 'Avião', imageSrc: '/avatars/presets/avatar-preset-10-aviao.png' },
] as const;
type AvatarIdentity = Pick<User, 'name'> & { avatar?: Avatar; avatarUrl?: string | null };

export function avatarInitials(name: string) { return name.split(/\s+/).filter(Boolean).slice(0, 2).map((part) => part[0]?.toUpperCase()).join('') || '?'; }
export function UserAvatar({ user, size = 'md', decorative = false, className = '' }: { user: AvatarIdentity; size?: 'xs' | 'sm' | 'md' | 'lg' | 'xl'; decorative?: boolean; className?: string }) {
  const [broken, setBroken] = useState(false);
  const avatar = user.avatar;
  useEffect(() => setBroken(false), [avatar?.url, avatar?.presetId, user.avatarUrl]);
  const label = decorative ? undefined : `Avatar de ${user.name}`;
  const classes = `user-avatar user-avatar-${size}${className ? ` ${className}` : ''}`;
  const avatarPixels = { xs: 28, sm: 35, md: 38, lg: 72, xl: 92 }[size];
  if (!broken && avatar?.type === 'upload' && avatar.url) return <img className={classes} width={avatarPixels} height={avatarPixels} src={avatar.url.startsWith('/') ? `${API_URL}${avatar.url}` : avatar.url} alt={label ?? ''} aria-hidden={decorative} crossOrigin="anonymous" onError={() => setBroken(true)} />;
  if (!broken && avatar?.type === 'google' && avatar.url) return <img className={classes} width={avatarPixels} height={avatarPixels} src={avatar.url} alt={label ?? ''} aria-hidden={decorative} referrerPolicy="no-referrer" onError={() => setBroken(true)} />;
  const preset = avatar?.type === 'preset' ? AVATAR_PRESETS.find((item) => item.id === avatar.presetId) : undefined;
  if (!broken && preset) return <img className={classes} width={avatarPixels} height={avatarPixels} src={preset.imageSrc} alt={label ?? ''} aria-hidden={decorative} onError={() => setBroken(true)} />;
  return <span className={`${classes} user-avatar-fallback`} aria-label={label} aria-hidden={decorative}>{avatarInitials(user.name)}</span>;
}

function AvatarDialog({ onClose, children, title }: { onClose: () => void; children: React.ReactNode; title: string }) {
  const dialogRef = useRef<HTMLElement>(null); const titleId = useId(); useDialogFocus(onClose, dialogRef);
  return createPortal(<div className="avatar-dialog-backdrop" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget) onClose(); }}><section className="panel avatar-dialog" ref={dialogRef} role="dialog" aria-modal="true" aria-labelledby={titleId}><div className="avatar-dialog-header"><h2 id={titleId}>{title}</h2><button className="avatar-dialog-close" type="button" aria-label="Fechar" title="Fechar" data-dialog-initial-focus onClick={onClose}><IconX size={19} aria-hidden="true" /></button></div>{children}</section></div>, document.body);
}

export function AvatarManager({ user, onUpdated }: { user: User; onUpdated: (user: User) => void }) {
  const [mode, setMode] = useState<'presets' | 'photo' | null>(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const { confirm, toast } = useFeedback();
  async function choosePreset(id: string) { setSaving(true); setError(''); try { onUpdated(await api.setAvatarPreset(id)); setMode(null); toast({ title: 'Avatar atualizado.', tone: 'success' }); } catch (err) { setError(err instanceof Error ? err.message : 'Não foi possível atualizar o avatar.'); } finally { setSaving(false); } }
  async function remove() { await confirm({ title: 'Remover avatar?', description: 'O perfil voltará a usar as iniciais ou a foto do Google, quando disponível.', tone: 'danger', confirmLabel: 'Remover', onConfirm: async () => { onUpdated(await api.removeAvatar()); toast({ title: 'Avatar removido.', tone: 'success' }); } }); }
  return <section className="panel avatar-manager"><div className="avatar-manager-preview"><UserAvatar user={user} size="xl" /><div><p className="eyebrow">AVATAR</p><h2>{user.avatar?.type === 'preset' ? 'Avatar predefinido' : user.avatar?.type === 'upload' ? 'Foto de perfil' : 'Sua identidade'}</h2><p className="muted">Escolha uma ilustração ou envie uma foto quadrada.</p></div></div><div className="avatar-manager-actions"><button className="button button-secondary" type="button" onClick={() => { setError(''); setMode('presets'); }}><IconPhoto size={17} aria-hidden="true" />Escolher avatar</button><button className="button button-secondary" type="button" onClick={() => { setError(''); setMode('photo'); }}><IconUpload size={17} aria-hidden="true" />Enviar foto</button>{(user.avatar?.type === 'preset' || user.avatar?.type === 'upload') && <button className="button button-secondary danger-button" type="button" onClick={() => { void remove(); }}><IconTrash size={16} aria-hidden="true" />Remover</button>}</div>{error && <p className="form-error" role="alert">{error}</p>}{mode === 'presets' && <AvatarDialog title="Escolha seu avatar" onClose={() => setMode(null)}><div className="avatar-preset-grid">{AVATAR_PRESETS.map((preset) => <button className={user.avatar?.presetId === preset.id ? 'avatar-preset is-selected' : 'avatar-preset'} type="button" key={preset.id} aria-label={`Avatar ${preset.label}`} disabled={saving} onClick={() => { void choosePreset(preset.id); }}><img className="avatar-preset-art" width="256" height="256" src={preset.imageSrc} alt="" aria-hidden="true" /></button>)}</div><p className="muted avatar-dialog-hint">A seleção é salva imediatamente.</p></AvatarDialog>}{mode === 'photo' && <PhotoDialog onClose={() => setMode(null)} onUpdated={(next) => { onUpdated(next); setMode(null); toast({ title: 'Foto atualizada.', tone: 'success' }); }} onError={setError} />}</section>;
}

async function cropToFile(source: string, area: Area) {
  const image = new Image(); image.src = source; await new Promise<void>((resolve, reject) => { image.onload = () => resolve(); image.onerror = () => reject(new Error('Não foi possível ler a imagem.')); });
  const canvas = document.createElement('canvas'); canvas.width = 256; canvas.height = 256; const context = canvas.getContext('2d'); if (!context) throw new Error('Seu navegador não suporta recorte de imagem.');
  context.drawImage(image, area.x, area.y, area.width, area.height, 0, 0, 256, 256);
  const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, 'image/jpeg', .9)); if (!blob) throw new Error('Não foi possível preparar a imagem.'); return new File([blob], 'avatar.jpg', { type: 'image/jpeg' });
}

function PhotoDialog({ onClose, onUpdated, onError }: { onClose: () => void; onUpdated: (user: User) => void; onError: (message: string) => void }) {
  const inputRef = useRef<HTMLInputElement>(null); const [source, setSource] = useState<string>(); const [crop, setCrop] = useState({ x: 0, y: 0 }); const [zoom, setZoom] = useState(1); const [area, setArea] = useState<Area>(); const [saving, setSaving] = useState(false);
  useEffect(() => () => { if (source) URL.revokeObjectURL(source); }, [source]);
  function select(event: ChangeEvent<HTMLInputElement>) { const file = event.target.files?.[0]; if (!file) return; if (!['image/jpeg', 'image/png', 'image/webp'].includes(file.type)) { onError('Escolha uma imagem JPEG, PNG ou WebP.'); return; } if (file.size > 5 * 1024 * 1024) { onError('A imagem deve ter no máximo 5 MB.'); return; } if (source) URL.revokeObjectURL(source); setSource(URL.createObjectURL(file)); onError(''); }
  async function save() { if (!source || !area) return; setSaving(true); try { onUpdated(await api.uploadAvatar(await cropToFile(source, area))); } catch (err) { onError(err instanceof Error ? err.message : 'Não foi possível enviar a foto.'); } finally { setSaving(false); } }
  return <AvatarDialog title="Enviar foto de perfil" onClose={onClose}>{!source ? <div className="avatar-upload-empty"><IconCamera size={30} aria-hidden="true" /><p>JPEG, PNG ou WebP de até 5 MB.</p><button className="button button-primary" type="button" onClick={() => inputRef.current?.click()}>Selecionar imagem</button></div> : <><div className="avatar-cropper"><Cropper image={source} crop={crop} zoom={zoom} aspect={1} cropShape="round" showGrid={false} onCropChange={setCrop} onZoomChange={setZoom} onCropComplete={(_, next) => setArea(next)} /></div><label className="avatar-zoom">Zoom<input type="range" min={1} max={3} step={.05} value={zoom} onChange={(event) => setZoom(Number(event.target.value))} /></label><div className="avatar-dialog-actions"><button className="button button-secondary" type="button" onClick={() => inputRef.current?.click()}>Escolher outra</button><button className="button button-primary" type="button" disabled={saving || !area} onClick={() => { void save(); }}>{saving ? 'Enviando…' : 'Salvar foto'}</button></div></>}<input ref={inputRef} className="visually-hidden" type="file" accept="image/jpeg,image/png,image/webp" onChange={select} /></AvatarDialog>;
}
