import { IsIn, IsString, IsUUID, Length } from 'class-validator';

export class CreateInviteDto { @IsIn(['goal', 'team']) targetType!: 'goal' | 'team'; @IsUUID() targetId!: string; }
export class InviteTokenDto { @IsString() @Length(16, 200) token!: string; }
