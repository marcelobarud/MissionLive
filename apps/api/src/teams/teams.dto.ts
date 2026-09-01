import { IsOptional, IsString, Length } from 'class-validator';
import { UpdateMemberRoleDto } from '../goals/goals.dto';

export class CreateTeamDto { @IsString() @Length(1, 120) name!: string; @IsOptional() @IsString() @Length(0, 2000) description?: string; }
export class UpdateTeamDto extends CreateTeamDto {}
export { UpdateMemberRoleDto };
