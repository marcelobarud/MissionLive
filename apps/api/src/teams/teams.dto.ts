import { ArrayMaxSize, IsArray, IsDateString, IsOptional, IsString, IsUUID, Length } from 'class-validator';
import { UpdateMemberRoleDto } from '../goals/goals.dto';

export class CreateTeamDto { @IsString() @Length(1, 120) name!: string; @IsOptional() @IsString() @Length(0, 2000) description?: string; }
export class UpdateTeamDto extends CreateTeamDto {}
export class CreateTeamWithGoalDto extends CreateTeamDto {
  @IsString() @Length(1, 120) goalName!: string;
  @IsOptional() @IsString() @Length(0, 2000) goalDescription?: string;
  @IsDateString() startDate!: string;
  @IsOptional() @IsDateString() endDate?: string;
  @IsOptional() @IsUUID() categoryId?: string;
  @IsOptional() @IsString() @Length(2, 60) customCategory?: string;
  @IsOptional() @IsArray() @ArrayMaxSize(10) @IsString({ each: true }) tags?: string[];
  @IsOptional() @IsArray() @ArrayMaxSize(200) @IsString({ each: true }) stepTitles?: string[];
}
export { UpdateMemberRoleDto };
