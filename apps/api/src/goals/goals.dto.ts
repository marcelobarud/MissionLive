import { ArrayMaxSize, IsArray, IsBoolean, IsDateString, IsIn, IsOptional, IsString, IsUUID, Length } from 'class-validator';
import { Transform } from 'class-transformer';

export class CreateGoalDto {
  @IsString() @Length(1, 120) name!: string;
  @IsOptional() @IsString() @Length(0, 2000) description?: string;
  @IsOptional() @IsUUID() categoryId?: string;
  @IsOptional() @IsString() @Length(2, 60) customCategory?: string;
  @IsOptional() @IsArray() @ArrayMaxSize(10) @IsString({ each: true }) tags?: string[];
  @IsDateString() startDate!: string;
  @IsOptional() @IsDateString() endDate?: string;
  @IsOptional() @IsUUID() teamId?: string;
}
export class UpdateGoalDto extends CreateGoalDto {}
export class CreateStepDto {
  @IsString() @Length(1, 200) title!: string;
  @IsOptional() @IsString() @Length(0, 1000) description?: string;
  @IsOptional() @IsIn(['ALL_PARTICIPANTS', 'SPECIFIC_PARTICIPANT']) assignmentMode?: string;
  @IsOptional() @IsUUID() assigneeUserId?: string;
}
export class UpdateStepDto extends CreateStepDto {}
export class ReorderStepsDto { @IsArray() @ArrayMaxSize(200) @IsUUID('4', { each: true }) stepIds!: string[]; }
export class ProgressDto { @IsBoolean() completed!: boolean; }
export class OverrideGoalDto { @IsOptional() @IsString() @Length(0, 500) reason?: string; }
export class UpdateMemberRoleDto { @IsString() role!: string; }
export class ListGoalsQueryDto {
  @IsOptional() @IsString() @Length(1, 120) q?: string;
  @IsOptional() @IsIn(['active', 'completed', 'cancelled', 'archived']) status?: string;
  @IsOptional() @IsUUID() categoryId?: string;
  @IsOptional() @IsIn(['individual', 'shared', 'team']) context?: string;
  @IsOptional() @Transform(({ value }) => value === true || value === 'true') @IsBoolean() hasDeadline?: boolean;
  @IsOptional() @IsDateString() from?: string;
  @IsOptional() @IsDateString() to?: string;
  @IsOptional() @IsIn(['recent', 'name', 'deadline', 'progress-desc', 'progress-asc']) sort?: string;
}
