import { ChangeEvent, useEffect, useRef, useState } from 'react';
import Cropper, { Area } from 'react-easy-crop';
import NiceAvatar, { genConfig } from 'react-nice-avatar';
import { IconCamera, IconPhoto, IconTrash, IconUpload, IconX } from '@tabler/icons-react';
import { api, Avatar, User } from './api';
import { useFeedback } from './feedback';

export const AVATAR_PRESETS = Array.from({ length: 10 }, (_, index) => ({ id: `avatar-${String(index + 1).padStart(2, '0')}`, seed: `missionlive-avatar-${index + 1}` }));
const PRESET_CONFIGS = new Map(AVATAR_PRESETS.map((preset) => [preset.id, genConfig(preset.seed)]));
type AvatarIdentity = Pick<User, 'name'> & { avatar?: Avatar; avatarUrl?: string | null };

export function avatarInitials(name: string) { return name.split(/\s+/).filter(Boolean).slice(0, 2).map((part) => part[0]?.toUpperCase()).join('') || '?'; }
export function UserAvatar({ user, size = 'md', decorative = false, className = '' }: { user: AvatarIdentity; size?: 'xs' | 'sm' | 'md' | 'lg' | 'xl'; decorative?: boolean; className?: string }) {
  const [broken, setBroken] = useState(false);
  const avatar = user.avatar;
  useEffect(() => setBroken(false), [avatar?.url, avatar?.presetId, user.avatarUrl]);
  const label = decorative ? undefined : `Avatar de ${user.name}`;
  const classes = `user-avatar user-avatar-${size}${className ? ` ${className}` : ''}`;
  if (!broken && avatar?.type === 'upload' && avatar.url) return <img className={classes} src={avatar.url.startsWith('/') ? `http://localhost:3000${avatar.url}` : avatar.url} alt={label ?? ''} aria-hidden={decorative} onError={() => setBroken(true)} />;
  if (!broken && avatar?.type === 'google' && avatar.url) return <img className={classes} src={avatar.url} alt={label ?? ''} aria-hidden={decorative} referrerPolicy="no-referrer" onError={() => setBroken(true)} />;
  if (avatar?.type === 'preset' && avatar.presetId && PRESET_CONFIGS.has(avatar.presetId)) return <NiceAvatar className={classes} aria-hidden={decorative} {...PRESET_CONFIGS.get(avatar.presetId)} />;
  return <span className={`${classes} user-avatar-fallback`} aria-label={label} aria-hidden={decorative}>{avatarInitials(user.name)}</span>;
}

function AvatarDialog({ onClose, children, title }: { onClose: () => void; children: React.ReactNode; title: string }) {
  useEffect(() => { const onKey = (event: KeyboardEvent) => { if (event.key === 'Escape') onClose(); }; document.addEventListener('keydown', onKey); return () => document.removeEventListener('keydown', onKey); }, [onClose]);
  return <div className="avatar-dialog-backdrop" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget) onClose(); }}><div className="avatar-dialog" role="dialog" aria-modal="true" aria-labelledby="avatar-dialog-title"><div className="avatar-dialog-header"><h2 id="avatar-dialog-title">{title}</h2><button className="icon-button" type="button" aria-label="Fechar" onClick={onClose}><IconX size={19} aria-hidden="true" /></button></div>{children}</div></div>;
}

export function AvatarManager({ user, onUpdated }: { user: User; onUpdated: (user: User) => void }) {
  const [mode, setMode] = useState<'presets' | 'photo' | null>(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const { confirm, toast } = useFeedback();
  async function choosePreset(id: string) { setSaving(true); setError(''); try { onUpdated(await api.setAvatarPreset(id)); setMode(null); toast({ title: 'Avatar atualizado.', tone: 'success' }); } catch (err) { setError(err instanceof Error ? err.message : 'Não foi possível atualizar o avatar.'); } finally { setSaving(false); } }
  async function remove() { await confirm({ title: 'Remover avatar?', description: 'O perfil voltará a usar as iniciais ou a foto do Google, quando disponível.', tone: 'danger', confirmLabel: 'Remover', onConfirm: async () => { onUpdated(await api.removeAvatar()); toast({ title: 'Avatar removido.', tone: 'success' }); } }); }
  return <section className="panel avatar-manager"><div className="avatar-manager-preview"><UserAvatar user={user} size="xl" /><div><p className="eyebrow">AVATAR</p><h2>{user.avatar?.type === 'preset' ? 'Avatar predefinido' : user.avatar?.type === 'upload' ? 'Foto de perfil' : 'Sua identidade'}</h2><p className="muted">Escolha uma ilustração ou envie uma foto quadrada.</p></div></div><div className="avatar-manager-actions"><button className="button button-secondary" type="button" onClick={() => { setError(''); setMode('presets'); }}><IconPhoto size={17} aria-hidden="true" />Escolher avatar</button><button className="button button-secondary" type="button" onClick={() => { setError(''); setMode('photo'); }}><IconUpload size={17} aria-hidden="true" />Enviar foto</button>{(user.avatar?.type === 'preset' || user.avatar?.type === 'upload') && <button className="text-button danger-button" type="button" onClick={() => { void remove(); }}><IconTrash size={16} aria-hidden="true" />Remover</button>}</div>{error && <p className="form-error" role="alert">{error}</p>}{mode === 'presets' && <AvatarDialog title="Escolha seu avatar" onClose={() => setMode(null)}><div className="avatar-preset-grid">{AVATAR_PRESETS.map((preset) => <button className={user.avatar?.presetId === preset.id ? 'avatar-preset is-selected' : 'avatar-preset'} type="button" key={preset.id} aria-label={`Avatar ${preset.id.slice(-2)}`} disabled={saving} onClick={() => { void choosePreset(preset.id); }}><NiceAvatar aria-hidden="true" {...PRESET_CONFIGS.get(preset.id)} /></button>)}</div><p className="muted avatar-dialog-hint">A seleção é salva imediatamente.</p></AvatarDialog>}{mode === 'photo' && <PhotoDialog onClose={() => setMode(null)} onUpdated={(next) => { onUpdated(next); setMode(null); toast({ title: 'Foto atualizada.', tone: 'success' }); }} onError={setError} />}</section>;
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
