import { KeyboardEvent as ReactKeyboardEvent, useEffect, useId, useMemo, useRef, useState } from 'react';

const COUNTRY_CODES = `AD AE AF AG AI AL AM AO AQ AR AS AT AU AW AX AZ BA BB BD BE BF BG BH BI BJ BL BM BN BO BQ BR BS BT BV BW BY BZ CA CC CD CF CG CH CI CK CL CM CN CO CR CU CV CW CX CY CZ DE DJ DK DM DO DZ EC EE EG EH ER ES ET FI FJ FK FM FO FR GA GB GD GE GF GG GH GI GL GM GN GP GQ GR GS GT GU GW GY HK HM HN HR HT HU ID IE IL IM IN IO IQ IR IS IT JE JM JO JP KE KG KH KI KM KN KP KR KW KY KZ LA LB LC LI LK LR LS LT LU LV LY MA MC MD ME MF MG MH MK ML MM MN MO MP MQ MR MS MT MU MV MW MX MY MZ NA NC NE NF NG NI NL NO NP NR NU NZ OM PA PE PF PG PH PK PL PM PN PR PS PT PW PY QA RE RO RS RU RW SA SB SC SD SE SG SH SI SJ SK SL SM SN SO SR SS ST SV SX SY SZ TC TD TF TG TH TJ TK TL TM TN TO TR TT TV TW TZ UA UG UM US UY UZ VA VC VE VG VI VN VU WF WS YE YT ZA ZM ZW`.split(' ');

export const BRAZILIAN_REGIONS = [
  ['AC', 'Acre'], ['AL', 'Alagoas'], ['AP', 'Amapá'], ['AM', 'Amazonas'], ['BA', 'Bahia'], ['CE', 'Ceará'], ['DF', 'Distrito Federal'],
  ['ES', 'Espírito Santo'], ['GO', 'Goiás'], ['MA', 'Maranhão'], ['MT', 'Mato Grosso'], ['MS', 'Mato Grosso do Sul'], ['MG', 'Minas Gerais'],
  ['PA', 'Pará'], ['PB', 'Paraíba'], ['PR', 'Paraná'], ['PE', 'Pernambuco'], ['PI', 'Piauí'], ['RJ', 'Rio de Janeiro'], ['RN', 'Rio Grande do Norte'],
  ['RS', 'Rio Grande do Sul'], ['RO', 'Rondônia'], ['RR', 'Roraima'], ['SC', 'Santa Catarina'], ['SP', 'São Paulo'], ['SE', 'Sergipe'], ['TO', 'Tocantins'],
] as const;

const displayNames = typeof Intl.DisplayNames === 'function' ? new Intl.DisplayNames(['pt-BR'], { type: 'region' }) : null;

export type CountryOption = { value: string; label: string; searchText: string };

function countryLabel(code: string) {
  return displayNames?.of(code) || code;
}

export const COUNTRY_OPTIONS: CountryOption[] = COUNTRY_CODES.map((value) => {
  const label = countryLabel(value);
  return { value, label, searchText: `${label} ${value}`.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLocaleLowerCase() };
}).sort((a, b) => a.label.localeCompare(b.label, 'pt-BR'));

const optionId = (listboxId: string, index: number) => `${listboxId}-option-${index}`;

export function CountryPicker({ value, onChange, name = 'countryCode', invalid = false, errorId }: { value: string; onChange: (value: string) => void; name?: string; invalid?: boolean; errorId?: string }) {
  const rootRef = useRef<HTMLDivElement>(null); const listboxId = useId(); const inputId = useId();
  const [open, setOpen] = useState(false); const [query, setQuery] = useState(''); const [activeIndex, setActiveIndex] = useState(0);
  const selected = COUNTRY_OPTIONS.find((option) => option.value === value);
  const filtered = useMemo(() => { const normalized = query.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLocaleLowerCase().trim(); return normalized ? COUNTRY_OPTIONS.filter((option) => option.searchText.includes(normalized)) : COUNTRY_OPTIONS; }, [query]);
  useEffect(() => { if (!open) return undefined; const closeOnOutside = (event: MouseEvent) => { if (rootRef.current && !rootRef.current.contains(event.target as Node)) setOpen(false); }; document.addEventListener('mousedown', closeOnOutside); return () => document.removeEventListener('mousedown', closeOnOutside); }, [open]);
  useEffect(() => { setActiveIndex(0); }, [query]);
  function openPicker() { setOpen(true); setQuery(''); setActiveIndex(0); }
  function select(option: CountryOption) { onChange(option.value); setOpen(false); setQuery(''); }
  function handleKeyDown(event: ReactKeyboardEvent<HTMLInputElement>) {
    if (event.key === 'ArrowDown') { event.preventDefault(); if (!open) openPicker(); else setActiveIndex((index) => Math.min(index + 1, Math.max(0, filtered.length - 1))); }
    else if (event.key === 'ArrowUp') { event.preventDefault(); if (!open) openPicker(); else setActiveIndex((index) => Math.max(index - 1, 0)); }
    else if (event.key === 'Home' && open) { event.preventDefault(); setActiveIndex(0); }
    else if (event.key === 'End' && open) { event.preventDefault(); setActiveIndex(Math.max(0, filtered.length - 1)); }
    else if (event.key === 'Enter' && open && filtered[activeIndex]) { event.preventDefault(); select(filtered[activeIndex]); }
    else if (event.key === 'Escape' && open) { event.preventDefault(); setOpen(false); setQuery(''); }
  }
  return <div className="country-picker" ref={rootRef}><label htmlFor={inputId}>País</label><input id={inputId} className="country-picker-input" role="combobox" aria-autocomplete="list" aria-controls={listboxId} aria-expanded={open} aria-activedescendant={open && filtered[activeIndex] ? optionId(listboxId, activeIndex) : undefined} aria-invalid={invalid || undefined} aria-describedby={invalid ? errorId : undefined} placeholder="Pesquisar país…" value={open ? query : selected?.label ?? value} onFocus={openPicker} onChange={(event) => { if (!open) setOpen(true); setQuery(event.target.value); }} onKeyDown={handleKeyDown} autoComplete="country-name" /><input type="hidden" name={name} value={value} />{open && <div className="country-picker-list" id={listboxId} role="listbox" aria-label="Países"><div className="country-picker-results">{filtered.length === 0 ? <p className="country-picker-empty">Nenhum país encontrado.</p> : filtered.map((option, index) => <button id={optionId(listboxId, index)} className="country-picker-option" type="button" role="option" aria-selected={option.value === value} key={option.value} onMouseDown={(event) => event.preventDefault()} onClick={() => select(option)}><strong>{option.label}</strong><small>{option.value}</small></button>)}</div></div>}</div>;
}
