import { useCallback, useEffect, useMemo, useState } from 'react';
import { IconPhoto, IconPlus, IconTrash } from '@tabler/icons-react';
import { api, Goal, GoalPhoto } from './api';
import { Button, EmptyState, FormField, Input, Select, Spinner, Textarea } from './design-system';
import { Dialog, useOptionalFeedback } from './feedback';

const PAGE_SIZE = 24;

function errorMessage(error: unknown) { return error instanceof Error ? error.message : 'Não foi possível carregar a galeria.'; }
function photoDate(photo: GoalPhoto) { return new Intl.DateTimeFormat('pt-BR', { dateStyle: 'medium' }).format(new Date(photo.createdAt)); }

export function GoalGallery({ goal }: { goal: Goal }) {
  const feedback = useOptionalFeedback();
  const confirm = feedback?.confirm ?? (async () => false);
  const toast = feedback?.toast ?? (() => undefined);
  const [photos, setPhotos] = useState<GoalPhoto[]>([]);
  const [nextOffset, setNextOffset] = useState<number | null>(0);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState('');
  const [selected, setSelected] = useState<GoalPhoto | null>(null);
  const [addOpen, setAddOpen] = useState(false);
  const [file, setFile] = useState<File | null>(null);
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [stepId, setStepId] = useState('');
  const [previewUrl, setPreviewUrl] = useState('');
  const [formError, setFormError] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const availableSteps = useMemo(() => goal.steps.filter((step) => step.applicable !== false && step.assigneeAvailable !== false), [goal.steps]);

  const load = useCallback(async (offset = 0, append = false) => {
    if (append) setLoadingMore(true); else { setLoading(true); setError(''); }
    try {
      const page = await api.goalPhotos(goal.id, { limit: PAGE_SIZE, offset });
      setPhotos((current) => append ? [...current, ...page.items] : page.items);
      setNextOffset(page.nextOffset);
    } catch (err) { if (!append) setError(errorMessage(err)); }
    finally { setLoading(false); setLoadingMore(false); }
  }, [goal.id]);

  useEffect(() => { void load(); }, [load]);
  useEffect(() => () => { if (previewUrl) URL.revokeObjectURL(previewUrl); }, [previewUrl]);

  function resetForm() {
    if (previewUrl) URL.revokeObjectURL(previewUrl);
    setFile(null); setTitle(''); setDescription(''); setStepId(''); setPreviewUrl(''); setFormError(''); setAddOpen(false);
  }

  function chooseFile(nextFile: File | null) {
    if (previewUrl) URL.revokeObjectURL(previewUrl);
    setPreviewUrl(''); setFile(nextFile); setFormError('');
    if (!nextFile) return;
    if (!['image/jpeg', 'image/png', 'image/webp'].includes(nextFile.type)) { setFile(null); setFormError('Envie uma imagem JPEG, PNG ou WebP.'); return; }
    if (nextFile.size > 5 * 1024 * 1024) { setFile(null); setFormError('A foto deve ter no máximo 5 MB.'); return; }
    setPreviewUrl(URL.createObjectURL(nextFile));
  }

  async function submitPhoto(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!file) { setFormError('Escolha uma foto.'); return; }
    if (!title.trim()) { setFormError('Informe um título.'); return; }
    if (!description.trim()) { setFormError('Informe uma descrição.'); return; }
    setSubmitting(true); setFormError('');
    try {
      const photo = await api.createGoalPhoto(goal.id, file, { title: title.trim(), description: description.trim(), goalStepId: stepId || undefined });
      setPhotos((current) => [photo, ...current]);
      resetForm();
      toast({ title: 'Foto adicionada à galeria.', tone: 'success' });
    } catch (err) { setFormError(errorMessage(err)); }
    finally { setSubmitting(false); }
  }

  async function deletePhoto(photo: GoalPhoto) {
    await confirm({ title: 'Excluir esta foto?', description: 'A foto será removida da galeria e essa ação não poderá ser desfeita.', tone: 'danger', confirmLabel: 'Excluir', onConfirm: async () => { await api.deleteGoalPhoto(goal.id, photo.id); setPhotos((current) => current.filter((item) => item.id !== photo.id)); setSelected(null); toast({ title: 'Foto excluída.', tone: 'success' }); } });
  }

  const gallery = <section className="panel goal-gallery" aria-labelledby="goal-gallery-title"><div className="panel-heading"><div><p className="eyebrow"><IconPhoto size={16} stroke={1.9} aria-hidden="true" /> MEMÓRIAS DA META</p><h2 id="goal-gallery-title">Galeria</h2><p className="muted">Registre momentos que ajudam a contar seu avanço.</p></div>{goal.status === 'active' && <Button variant="secondary" type="button" startIcon={<IconPlus size={17} stroke={1.9} />} onClick={() => setAddOpen(true)}>Adicionar foto</Button>}</div>{error ? <div className="goal-gallery-error" role="alert"><p>{error}</p><Button variant="ghost" type="button" onClick={() => { void load(); }}>Tentar novamente</Button></div> : loading ? <div className="goal-gallery-loading"><Spinner /></div> : photos.length === 0 ? <EmptyState className="goal-gallery-empty" title="Ainda não há fotos" description="Adicione a primeira memória visual desta meta." action={goal.status === 'active' ? <Button variant="secondary" type="button" onClick={() => setAddOpen(true)}>Adicionar foto</Button> : undefined} icon={IconPhoto} /> : <><div className="goal-gallery-grid">{photos.map((photo) => <button className="goal-photo-card" key={photo.id} type="button" onClick={() => setSelected(photo)}><img src={api.mediaUrl(photo.thumbnailUrl)} alt={photo.title} width="480" height="320" loading="lazy" /><span className="goal-photo-card-copy"><strong>{photo.title}</strong><small>{photo.author.name} · {photoDate(photo)}</small>{photo.task && <small>Tarefa: {photo.task.title}</small>}</span></button>)}</div>{nextOffset !== null && <div className="goal-gallery-more"><Button variant="ghost" type="button" disabled={loadingMore} onClick={() => { void load(nextOffset, true); }}>{loadingMore ? 'Carregando…' : 'Carregar mais'}</Button></div>}</>}</section>;

  function addDialog() { return <Dialog open={addOpen} title="Adicionar foto" description="Escolha uma imagem e registre o contexto desta memória." onClose={submitting ? () => undefined : resetForm}><form className="goal-photo-form" onSubmit={(event) => { void submitPhoto(event); }}><FormField label="Foto" hint="JPEG, PNG ou WebP · até 5 MB" error={formError && !file ? formError : undefined}><input data-dialog-initial-focus name="image" type="file" accept="image/jpeg,image/png,image/webp" onChange={(event) => chooseFile(event.target.files?.[0] ?? null)} disabled={submitting} /></FormField>{previewUrl && <img className="goal-photo-preview" src={previewUrl} alt="Pré-visualização da foto selecionada" />}{formError && file && <p className="form-error" role="alert">{formError}</p>}<FormField label="Título"><Input name="title" autoComplete="off" value={title} onChange={(event) => setTitle(event.target.value)} maxLength={120} disabled={submitting} required /></FormField><FormField label="Descrição"><Textarea name="description" autoComplete="off" value={description} onChange={(event) => setDescription(event.target.value)} maxLength={1000} rows={4} disabled={submitting} required /></FormField><FormField label="Tarefa" hint="Opcional"><Select name="goalStepId" autoComplete="off" value={stepId} onChange={(event) => setStepId(event.target.value)} disabled={submitting}><option value="">Nenhuma tarefa específica</option>{availableSteps.map((step) => <option key={step.id} value={step.id}>{step.title}</option>)}</Select></FormField><div className="ds-dialog-actions"><Button variant="ghost" type="button" onClick={resetForm} disabled={submitting}>Cancelar</Button><Button type="submit" disabled={submitting}>{submitting ? 'Adicionando…' : 'Adicionar foto'}</Button></div></form></Dialog>; }

  return <>{gallery}{addDialog()}<Dialog open={Boolean(selected)} title={selected?.title ?? 'Foto'} onClose={() => setSelected(null)}>{selected && <div className="goal-photo-detail"><img src={api.mediaUrl(selected.imageUrl)} alt={selected.title} width="1920" height="1280" /><div><p>{selected.description}</p><small>{selected.author.name} · {photoDate(selected)}{selected.occurrenceLocalDate ? ` · ${selected.occurrenceLocalDate}` : ''}</small>{selected.task && <small>Tarefa: {selected.task.title}{selected.task.removed ? ' · removida' : ''}</small>}</div>{selected.canDelete && <Button variant="danger" type="button" startIcon={<IconTrash size={16} stroke={1.9} />} onClick={() => { void deletePhoto(selected); }}>Excluir foto</Button>}</div>}</Dialog></>;
}
