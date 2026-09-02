import { IsIn, IsString } from 'class-validator';
import { AVATAR_PRESET_IDS } from '../auth/user.serializer';

export class SetAvatarPresetDto {
  @IsString()
  @IsIn([...AVATAR_PRESET_IDS])
  presetId!: string;
}
