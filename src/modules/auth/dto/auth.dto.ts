import { IsNotEmpty, IsString, IsMobilePhone, Length } from 'class-validator';
import { Transform } from 'class-transformer';

/**
 * DTO for requesting OTP
 */
export class RequestOtpDto {
    @IsNotEmpty()
    @IsString()
    @Transform(({ value }) => value?.replace(/\s+/g, ''))
    @IsMobilePhone(undefined, {}, { message: 'Invalid phone number format' })
    phone: string;
}

/**
 * DTO for verifying OTP
 */
export class VerifyOtpDto {
    @IsNotEmpty()
    @IsString()
    @Transform(({ value }) => value?.replace(/\s+/g, ''))
    @IsMobilePhone(undefined, {}, { message: 'Invalid phone number format' })
    phone: string;

    @IsNotEmpty()
    @IsString()
    @Length(6, 6, { message: 'OTP must be 6 digits' })
    otp: string;
}

/**
 * DTO for refresh token request
 */
export class RefreshTokenDto {
    @IsNotEmpty()
    @IsString()
    refreshToken: string;
}

/**
 * Response DTO for authentication endpoints
 */
export interface AuthResponseDto {
    user: {
        id: string;
        username: string;
        phone: string;
        fullName?: string | null;
        avatarUrl?: string | null;
        targetExam?: string | null;
        notificationEnabled: boolean;
        createdAt: Date;
        lastActiveAt?: Date | null;
    };
    accessToken: string;
    refreshToken: string;
}

/**
 * Response DTO for token refresh
 */
export interface RefreshTokenResponseDto {
    accessToken: string;
    refreshToken: string;
}
