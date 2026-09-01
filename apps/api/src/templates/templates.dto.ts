import { ArrayMaxSize, IsArray, IsDateString, IsOptional, IsString, IsUUID, Length } from 'class-validator';

export class CreateTemplateDto {
  @IsString() @Length(1, 120) name!: string;
  @IsOptional() @IsString() @Length(0, 2000) description?: string;
  @IsOptional() @IsUUID() categoryId?: string;
  @IsOptional() @IsString() @Length(2, 60) customCategory?: string;
  @IsOptional() @IsArray() @ArrayMaxSize(10) @IsString({ each: true }) tags?: string[];
  @IsOptional() @IsArray() @ArrayMaxSize(200) @IsString({ each: true }) steps?: string[];
}

export class UseTemplateDto {
  @IsDateString() startDate!: string;
  @IsOptional() @IsDateString() endDate?: string;
  @IsOptional() @IsUUID() teamId?: string;
}
