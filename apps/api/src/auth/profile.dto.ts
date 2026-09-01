import { IsObject, IsOptional, IsString, IsUrl, Length } from 'class-validator';

export class UpdateProfileDto {
  @IsOptional() @IsString() @Length(2, 80) name?: string;
  @IsOptional() @IsUrl({ require_tld: false }) @Length(1, 500) avatarUrl?: string;
  @IsOptional() @IsString() @Length(1, 64) timezone?: string;
  @IsOptional() @IsObject() preferences?: Record<string, boolean | string | number>;
}
