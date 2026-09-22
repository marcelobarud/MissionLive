import { Type } from 'class-transformer';
import { IsInt, IsOptional, Max, Min } from 'class-validator';

export const MAX_ACTIVITY_OFFSET = 10_000;

export class ActivityListQueryDto {
  @IsOptional() @Type(() => Number) @IsInt() @Min(1) @Max(50) limit?: number;
  @IsOptional() @Type(() => Number) @IsInt() @Min(0) @Max(MAX_ACTIVITY_OFFSET) offset?: number;
}
