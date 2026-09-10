import { Transform } from 'class-transformer';
import { IsObject, IsOptional, IsString, IsUrl, Length, ValidateBy } from 'class-validator';
import { COUNTRY_CODES } from './countries';
import { isValidCivilDate } from './profile.validation';

const optionalText = () => Transform(({ value }) => typeof value === 'string' ? value.trim() || null : value);
const countryCode = () => Transform(({ value }) => typeof value === 'string' ? value.trim().toUpperCase() || null : value);
const validPhone = () => ValidateBy({ name: 'validPhone', validator: { validate: (value: unknown) => typeof value === 'string' && value.length > 0 && /^\+?[\d\s().-]+$/.test(value), defaultMessage: () => 'Informe um telefone válido.' } });
const validCountry = () => ValidateBy({ name: 'validCountry', validator: { validate: (value: unknown) => typeof value === 'string' && COUNTRY_CODES.has(value), defaultMessage: () => 'Selecione um país válido.' } });
const validBirthDate = () => ValidateBy({ name: 'validBirthDate', validator: { validate: (value: unknown) => typeof value === 'string' && isValidCivilDate(value), defaultMessage: () => 'Informe uma data de nascimento válida.' } });

export class UpdateProfileDto {
  @IsOptional() @IsString() @Length(2, 80) name?: string;
  @IsOptional() @IsUrl({ require_tld: false }) @Length(1, 500) avatarUrl?: string;
  @IsOptional() @IsString() @Length(1, 64) timezone?: string;
  @IsOptional() @IsObject() preferences?: Record<string, boolean | string | number>;
  @IsOptional() @optionalText() @IsString() @Length(1, 32) @validPhone() phone?: string | null;
  @IsOptional() @optionalText() @IsString() @Length(10, 10) @validBirthDate() birthDate?: string | null;
  @IsOptional() @countryCode() @IsString() @Length(2, 2) @validCountry() countryCode?: string | null;
  @IsOptional() @optionalText() @IsString() @Length(1, 100) region?: string | null;
  @IsOptional() @optionalText() @IsString() @Length(1, 100) city?: string | null;
}
