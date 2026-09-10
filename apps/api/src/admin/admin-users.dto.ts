import { Transform, Type } from 'class-transformer';
import { IsIn, IsInt, IsOptional, IsString, IsUUID, Max, Min } from 'class-validator';

export type AdminUserStatus = 'active' | 'disabled';

export class ListAdminUsersQueryDto {
  @IsOptional() @Type(() => Number) @IsInt() @Min(1) page = 1;
  @IsOptional() @Type(() => Number) @IsInt() @Min(1) @Max(100) pageSize = 20;
  @IsOptional() @Transform(({ value }) => typeof value === 'string' ? value.trim() : value) @IsString() search?: string;
  @IsOptional() @IsIn(['active', 'disabled']) status?: AdminUserStatus;
  @IsOptional() @IsIn(['USER', 'ADMIN', 'SUPER_ADMIN']) platformRole?: string;
}

export class UpdateAdminUserStatusDto {
  @IsString() @IsIn(['active', 'disabled']) status!: AdminUserStatus;
}

export class AdminUserIdParamDto {
  @IsUUID() userId!: string;
}
