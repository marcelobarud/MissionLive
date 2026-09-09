import { IsDateString, IsIn, IsOptional, IsString, IsUUID, Length, Matches } from 'class-validator';

export class CreateReminderDto {
  @IsUUID() goalId!: string;
  @IsOptional() @IsUUID() targetUserId?: string;
  @IsOptional() @IsUUID() goalStepId?: string;
  @IsOptional() @IsDateString() remindAt?: string;
  @IsString() @Length(1, 64) timezone!: string;
  @IsOptional() @IsIn(['ONCE', 'DAILY']) recurrenceType?: string;
  @IsOptional() @IsString() @Matches(/^(?:[01]\d|2[0-3]):[0-5]\d$/) timeOfDay?: string;
}

export class UpdateReminderDto {
  @IsOptional() @IsDateString() remindAt?: string;
  @IsOptional() @IsString() @Length(1, 64) timezone?: string;
  @IsOptional() @IsString() @Matches(/^(?:[01]\d|2[0-3]):[0-5]\d$/) timeOfDay?: string;
}
