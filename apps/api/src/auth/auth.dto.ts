import { IsEmail, IsOptional, IsString, Length, MinLength } from 'class-validator';

export class RegisterDto { @IsEmail() email!: string; @IsString() @Length(2, 80) name!: string; @IsString() @MinLength(8) password!: string; }
export class LoginDto { @IsEmail() email!: string; @IsString() @MinLength(1) password!: string; }
export class TokenDto { @IsString() @MinLength(16) token!: string; }
export class ForgotPasswordDto { @IsEmail() email!: string; }
export class ResetPasswordDto extends TokenDto { @IsString() @MinLength(8) password!: string; }
export class GoogleCallbackDto { @IsOptional() @IsString() code?: string; @IsOptional() @IsString() state?: string; }
