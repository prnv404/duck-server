import { UseGuards } from '@nestjs/common';
import { Args, Mutation, Resolver } from '@nestjs/graphql';
import { AuthService } from './auth.service';
import { AuthResponse, RefreshTokenResponse, RequestOtpInput, VerifyOtpInput } from './dto/auth.dto';
import { CurrentUser } from '@/common/decorators/current-user.decorator';
import { type User } from '@/database/schema';
import { GqlAuthGuard } from '@/common/guards';
import { GqlRefreshTokenGuard } from '@/common/guards';

@Resolver()
export class AuthResolver {
    constructor(private readonly authService: AuthService) { }

    @Mutation(() => Boolean)
    async requestOtp(@Args('input') input: RequestOtpInput): Promise<boolean> {
        return this.authService.requestOtp(input);
    }

    @Mutation(() => AuthResponse)
    async verifyOtp(@Args('input') input: VerifyOtpInput): Promise<AuthResponse> {
        return this.authService.verifyOtp(input);
    }

    @Mutation(() => Boolean)
    @UseGuards(GqlAuthGuard)
    async logout(@CurrentUser() user: User): Promise<boolean> {
        return this.authService.logout(user.id);
    }

    @Mutation(() => RefreshTokenResponse)
    @UseGuards(GqlRefreshTokenGuard)
    async refreshTokens(
        @CurrentUser() user: any, // Payload from RefreshTokenStrategy
    ): Promise<RefreshTokenResponse> {
        return this.authService.refreshTokens(user.sub, user.refreshToken);
    }
}
