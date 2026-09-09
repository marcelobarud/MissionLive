import { KeyboardEvent as ReactKeyboardEvent, useEffect, useId, useMemo, useRef, useState } from 'react';

const FALLBACK_TIMEZONES = ['America/Sao_Paulo', 'America/Manaus', 'America/Recife', 'America/New_York', 'Europe/London', 'Asia/Tokyo', 'UTC'];
const POPULAR_TIMEZONES = ['America/Sao_Paulo', 'America/Manaus', 'America/Recife', 'America/New_York', 'Europe/London', 'Asia/Tokyo', 'UTC'];
const FRIENDLY_NAMES: Record<string, string> = { 'America/Sao_Paulo': 'Brasília', 'America/Manaus': 'Manaus', 'America/Recife': 'Recife', 'America/New_York': 'Nova York', 'Europe/London': 'Londres', 'Asia/Tokyo': 'Tóquio', UTC: 'UTC' };

export type TimezoneOption = { value: string; label: string; offset: string; searchText: string };

function timezoneValues() {
  if (typeof Intl.supportedValuesOf === 'function') return [...new Set([...POPULAR_TIMEZONES, ...Intl.supportedValuesOf('timeZone')])];
  return FALLBACK_TIMEZONES;
}

function friendlyName(value: string) {
  if (FRIENDLY_NAMES[value]) return FRIENDLY_NAMES[value];
  const city = value.split('/').pop() ?? value;
  return city.replace(/_/g, ' ').replace(/-/g, ' ').replace(/\b\w/g, (letter) => letter.toUpperCase());
}

function timezoneOffset(value: string) {
  try {
    const part = new Intl.DateTimeFormat('en-US', { timeZone: value, timeZoneName: 'longOffset' }).formatToParts(new Date()).find((item) => item.type === 'timeZoneName')?.value ?? 'GMT';
    const match = part.match(/^GMT([+-])(\d{2})(?::?(\d{2}))?$/);
    if (!match) return 'UTC+00:00';
    return `UTC${match[1] === '-' ? '−' : '+'}${match[2]}:${match[3] ?? '00'}`;
  } catch {
    return 'UTC+00:00';
  }
}

export const TIMEZONE_OPTIONS: TimezoneOption[] = timezoneValues().map((value) => {
  const name = friendlyName(value); const offset = timezoneOffset(value);
  return { value, label: `${name} — ${offset}`, offset, searchText: `${name} ${value} ${offset}`.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLocaleLowerCase() };
}).sort((a, b) => {
  const popularA = POPULAR_TIMEZONES.indexOf(a.value); const popularB = POPULAR_TIMEZONES.indexOf(b.value);
  if (popularA !== -1 || popularB !== -1) return (popularA === -1 ? POPULAR_TIMEZONES.length : popularA) - (popularB === -1 ? POPULAR_TIMEZONES.length : popularB);
  return a.label.localeCompare(b.label, 'pt-BR');
});

function optionId(listboxId: string, index: number) { return `${listboxId}-option-${index}`; }

export function TimezonePicker({ value, onChange, name = 'timezone' }: { value: string; onChange: (value: string) => void; name?: string }) {
  const rootRef = useRef<HTMLDivElement>(null); const listboxId = useId(); const inputId = useId();
  const [open, setOpen] = useState(false); const [query, setQuery] = useState(''); const [activeIndex, setActiveIndex] = useState(0);
  const selected = TIMEZONE_OPTIONS.find((option) => option.value === value);
  const filtered = useMemo(() => { const normalized = query.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLocaleLowerCase().trim(); return normalized ? TIMEZONE_OPTIONS.filter((option) => option.searchText.includes(normalized)) : TIMEZONE_OPTIONS; }, [query]);
  useEffect(() => { if (!open) return undefined; const closeOnOutside = (event: MouseEvent) => { if (rootRef.current && !rootRef.current.contains(event.target as Node)) setOpen(false); }; document.addEventListener('mousedown', closeOnOutside); return () => document.removeEventListener('mousedown', closeOnOutside); }, [open]);
  useEffect(() => { setActiveIndex(0); }, [query]);
  function openPicker() { setOpen(true); setQuery(''); setActiveIndex(0); }
  function select(option: TimezoneOption) { onChange(option.value); setOpen(false); setQuery(''); }
  function handleKeyDown(event: ReactKeyboardEvent<HTMLInputElement>) {
    if (event.key === 'ArrowDown') { event.preventDefault(); if (!open) openPicker(); else setActiveIndex((index) => Math.min(index + 1, Math.max(0, filtered.length - 1))); }
    else if (event.key === 'ArrowUp') { event.preventDefault(); if (!open) openPicker(); else setActiveIndex((index) => Math.max(index - 1, 0)); }
    else if (event.key === 'Home' && open) { event.preventDefault(); setActiveIndex(0); }
    else if (event.key === 'End' && open) { event.preventDefault(); setActiveIndex(Math.max(0, filtered.length - 1)); }
    else if (event.key === 'Enter' && open && filtered[activeIndex]) { event.preventDefault(); select(filtered[activeIndex]); }
    else if (event.key === 'Escape' && open) { event.preventDefault(); setOpen(false); setQuery(''); }
  }
  return <div className="timezone-picker" ref={rootRef}><label htmlFor={inputId}>Fuso horário</label><input id={inputId} className="timezone-picker-input" role="combobox" aria-autocomplete="list" aria-controls={listboxId} aria-expanded={open} aria-activedescendant={open && filtered[activeIndex] ? optionId(listboxId, activeIndex) : undefined} placeholder="Pesquisar cidade ou fuso..." value={open ? query : (selected?.label ?? value) || ''} onFocus={openPicker} onChange={(event) => { if (!open) setOpen(true); setQuery(event.target.value); }} onKeyDown={handleKeyDown} /><input type="hidden" name={name} value={value} /><div className="timezone-picker-hint">{selected?.value ?? 'Selecione um fuso horário válido.'}</div>{open && <div className="timezone-picker-list" id={listboxId} role="listbox" aria-label="Fusos horários"><div className="timezone-picker-results">{filtered.length === 0 ? <p className="timezone-picker-empty">Nenhum fuso encontrado.</p> : filtered.map((option, index) => <button id={optionId(listboxId, index)} className="timezone-picker-option" type="button" role="option" aria-selected={option.value === value} key={option.value} onMouseDown={(event) => event.preventDefault()} onClick={() => select(option)}><strong>{option.label}</strong><small>{option.value}</small></button>)}</div></div>}</div>;
}
