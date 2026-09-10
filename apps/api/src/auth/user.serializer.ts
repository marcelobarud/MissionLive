import { PublicAvatar } from './auth.types';

export const AVATAR_PRESET_IDS = new Set(Array.from({ length: 10 }, (_, index) => `avatar-${String(index + 1).padStart(2, '0')}`));

type AvatarFields = { id: string; avatarUrl?: string | null; avatarType?: string | null; avatarPresetId?: string | null; avatarFileKey?: string | null };

export function publicAvatar(user: AvatarFields): PublicAvatar {
  if (user.avatarType === 'UPLOAD' && user.avatarFileKey) {
    const fileName = user.avatarFileKey.split('/').pop();
    if (fileName && /^[0-9a-f-]{36}\.webp$/i.test(fileName) && user.avatarFileKey === `${user.id}/${fileName}`) return { type: 'upload', presetId: null, url: `/media/avatars/${encodeURIComponent(user.id)}/${encodeURIComponent(fileName)}` };
  }
  if (user.avatarType === 'PRESET' && user.avatarPresetId && AVATAR_PRESET_IDS.has(user.avatarPresetId)) return { type: 'preset', presetId: user.avatarPresetId, url: null };
  if (user.avatarUrl) return { type: 'google', presetId: null, url: user.avatarUrl };
  return { type: null, presetId: null, url: null };
}

export function publicIdentity<T extends AvatarFields & { email: string; name: string }>(user: T) {
  return { id: user.id, email: user.email, name: user.name, avatarUrl: user.avatarUrl, avatar: publicAvatar(user) };
}

export function publicUser<T extends AvatarFields & { email: string; name: string; timezone?: string; onboardingCompletedAt?: Date | null; preferencesJson?: string; phone?: string | null; birthDate?: string | null; countryCode?: string | null; region?: string | null; city?: string | null }>(user: T) {
  return { id: user.id, email: user.email, name: user.name, avatarUrl: user.avatarUrl, avatar: publicAvatar(user), timezone: user.timezone, onboardingCompletedAt: user.onboardingCompletedAt?.toISOString() ?? null, preferences: JSON.parse(user.preferencesJson ?? '{}'), phone: user.phone ?? null, birthDate: user.birthDate ?? null, countryCode: user.countryCode ?? null, region: user.region ?? null, city: user.city ?? null };
}
