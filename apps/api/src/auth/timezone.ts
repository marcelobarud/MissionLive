export function isValidIanaTimezone(value: string) {
  const timezone = value.trim();
  if (!timezone || (timezone !== 'UTC' && !timezone.includes('/'))) return false;
  try {
    new Intl.DateTimeFormat('en-US', { timeZone: timezone }).format();
    return true;
  } catch {
    return false;
  }
}
