import { Body, Controller, Post, HttpCode, HttpStatus, UseGuards, Req } from '@nestjs/common';
import { AuthService } from './auth.service';
import { RequestOtpDto, VerifyOtpDto, RefreshTokenDto, AuthResponseDto, RefreshTokenResponseDto } from './dto/auth.dto';
import { JwtRestAuthGuard } from '@/common/guards/jwt-rest.guard';
import { Throttle } from '@nestjs/throttler';

@Controller('auth')
export class AuthController {
    constructor(private readonly authService: AuthService) {}

    /**
     * Request OTP for phone number
     * POST /api/v1/auth/request-otp
     */
    @Post('request-otp')
    @HttpCode(HttpStatus.OK)
    @Throttle({ default: { limit: 3, ttl: 60000 } }) // 3 requests per minute
    async requestOtp(@Body() dto: RequestOtpDto): Promise<{ success: boolean; message: string }> {
        await this.authService.requestOtp(dto);
        return {
            success: true,
            message: 'OTP sent successfully',
        };
    }

    /**
     * Verify OTP and login/signup
     * POST /api/v1/auth/verify-otp
     */
    @Post('verify-otp')
    @HttpCode(HttpStatus.OK)
    @Throttle({ default: { limit: 5, ttl: 60000 } }) // 5 requests per minute
    async verifyOtp(@Body() dto: VerifyOtpDto): Promise<AuthResponseDto> {
        const result = await this.authService.verifyOtp(dto);
        return {
            user: {
                id: result.user.id,
                username: result.user.username,
                phone: result.user.phone,
                fullName: result.user.fullName,
                avatarUrl: result.user.avatarUrl,
                targetExam: result.user.targetExam,
                notificationEnabled: result.user.notificationEnabled,
                createdAt: result.user.createdAt,
                lastActiveAt: result.user.lastActiveAt,
            },
            accessToken: result.accessToken,
            refreshToken: result.refreshToken,
        };
    }

    /**
     * Refresh access token
     * POST /api/v1/auth/refresh
     */
    @Post('refresh')
    @HttpCode(HttpStatus.OK)
    async refreshToken(@Body() dto: RefreshTokenDto, @Req() req: any): Promise<RefreshTokenResponseDto> {
        // Extract user ID from the refresh token (we need to decode it)
        const decoded = this.decodeToken(dto.refreshToken);
        const result = await this.authService.refreshTokens(decoded.sub, dto.refreshToken);
        return {
            accessToken: result.accessToken,
            refreshToken: result.refreshToken,
        };
    }

    /**
     * Logout user
     * POST /api/v1/auth/logout
     */
    @Post('logout')
    @HttpCode(HttpStatus.OK)
    @UseGuards(JwtRestAuthGuard)
    async logout(@Req() req: any): Promise<{ success: boolean; message: string }> {
        await this.authService.logout(req.user.id);
        return {
            success: true,
            message: 'Logged out successfully',
        };
    }

    /**
     * Helper to decode JWT token without verification
     */
    private decodeToken(token: string): any {
        const base64Url = token.split('.')[1];
        const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
        const jsonPayload = decodeURIComponent(
            Buffer.from(base64, 'base64')
                .toString()
                .split('')
                .map((c) => '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2))
                .join(''),
        );
        return JSON.parse(jsonPayload);
    }
}
