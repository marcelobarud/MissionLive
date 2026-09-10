import { BadRequestException } from '@nestjs/common';
import { parsePhoneNumberFromString } from 'libphonenumber-js/min';

export function normalizePhone(value: string) {
  const parsed = parsePhoneNumberFromString(value);
  if (!parsed?.isValid()) throw new BadRequestException('Informe um telefone válido.');
  return parsed.number;
}

export function isValidCivilDate(value: string) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const date = new Date(`${value}T00:00:00.000Z`);
  return !Number.isNaN(date.valueOf()) && date.toISOString().slice(0, 10) === value && value <= new Date().toISOString().slice(0, 10);
}
