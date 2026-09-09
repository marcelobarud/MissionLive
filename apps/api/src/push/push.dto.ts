import { IsString, IsUrl, Length, Matches } from 'class-validator';

const base64UrlPattern = /^[A-Za-z0-9_-]+={0,2}$/;

export class PushSubscriptionDto {
  @IsUrl({ protocols: ['https'], require_tld: false }) @Length(1, 2048) endpoint!: string;
  @IsString() @Length(16, 256) @Matches(base64UrlPattern) p256dh!: string;
  @IsString() @Length(16, 256) @Matches(base64UrlPattern) auth!: string;
}

export class RemovePushSubscriptionDto {
  @IsUrl({ protocols: ['https'], require_tld: false }) @Length(1, 2048) endpoint!: string;
}
