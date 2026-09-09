type LocalParts = { year: number; month: number; day: number; hour: number; minute: number; second: number };

function partsAt(date: Date, timezone: string): LocalParts {
  const parts = new Intl.DateTimeFormat('en-US', { timeZone: timezone, year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', second: '2-digit', hourCycle: 'h23' }).formatToParts(date);
  const value = (type: string) => Number(parts.find((part) => part.type === type)?.value ?? 0);
  return { year: value('year'), month: value('month'), day: value('day'), hour: value('hour'), minute: value('minute'), second: value('second') };
}

export function isValidTimezone(timezone: string) {
  try { new Intl.DateTimeFormat('en-US', { timeZone: timezone }).format(); return true; } catch { return false; }
}

export function localDateAt(date: Date, timezone: string) {
  const parts = partsAt(date, timezone);
  return `${parts.year.toString().padStart(4, '0')}-${parts.month.toString().padStart(2, '0')}-${parts.day.toString().padStart(2, '0')}`;
}

export function localTimeAt(date: Date, timezone: string) {
  const parts = partsAt(date, timezone);
  return `${parts.hour.toString().padStart(2, '0')}:${parts.minute.toString().padStart(2, '0')}`;
}

export function addLocalDays(localDate: string, days: number) {
  const date = new Date(`${localDate}T12:00:00.000Z`);
  date.setUTCDate(date.getUTCDate() + days);
  return date.toISOString().slice(0, 10);
}

export function utcAtLocalDateTime(localDate: string, timeOfDay: string, timezone: string) {
  const match = /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})$/.exec(`${localDate}T${timeOfDay}`);
  if (!match) throw new Error('Invalid local date/time.');
  const target = Date.UTC(Number(match[1]), Number(match[2]) - 1, Number(match[3]), Number(match[4]), Number(match[5]));
  let candidate = target;
  for (let attempt = 0; attempt < 4; attempt += 1) {
    const parts = partsAt(new Date(candidate), timezone);
    const rendered = Date.UTC(parts.year, parts.month - 1, parts.day, parts.hour, parts.minute, parts.second);
    const difference = target - rendered;
    candidate += difference;
    if (difference === 0) break;
  }
  return new Date(candidate);
}

export function storedDateKey(date: Date | string) { return new Date(date).toISOString().slice(0, 10); }
