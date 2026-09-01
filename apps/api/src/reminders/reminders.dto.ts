import { IsDateString, IsOptional, IsString, IsUUID, Length } from 'class-validator';

export class CreateReminderDto {
  @IsUUID() goalId!: string;
  @IsDateString() remindAt!: string;
  @IsString() @Length(1, 64) timezone!: string;
}

export class UpdateReminderDto {
  @IsOptional() @IsDateString() remindAt?: string;
  @IsOptional() @IsString() @Length(1, 64) timezone?: string;
}
