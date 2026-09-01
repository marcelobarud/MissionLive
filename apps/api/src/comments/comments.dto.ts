import { IsIn, IsString, MaxLength, MinLength } from 'class-validator';

export class CreateCommentDto {
  @IsString() @MinLength(1) @MaxLength(2000) body!: string;
}

export class UpdateCommentDto extends CreateCommentDto {}

export class ReactionDto {
  @IsIn(['👏', '❤️', '🎉', '💪']) emoji!: string;
}
