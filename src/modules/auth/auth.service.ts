import { Injectable } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';
import { EnvService } from '@/config/config.service';
import { UserService } from '@/modules/user/user.service';
import { AuthResponse, RefreshTokenResponse, RequestOtpInput, VerifyOtpInput } from './dto/auth.dto';
import { RedisService, RedisKeys } from '@/database/redis';
import { UnauthorizedError } from '@/common/exceptions';

@Injectable()
export class AuthService {
    constructor(
        private readonly userService: UserService,
        private readonly jwtService: JwtService,
        private readonly configService: EnvService,
        private readonly redisService: RedisService,
    ) {}

    async requestOtp(input: RequestOtpInput): Promise<boolean> {
        const { phone } = input;
        // Generate 6-digit OTP
        const otp = Math.floor(100000 + Math.random() * 900000).toString();

        // Store in Redis with 5 minutes expiry
        const redis = this.redisService.getClient();
        const result = await redis.set(RedisKeys.otp(phone), otp, { ex: 3000 });
        // Log OTP (Mock sending)
        console.log(`[MOCK OTP] Sending OTP ${otp} to ${phone}`);

        return true;
    }

    async verifyOtp(input: VerifyOtpInput): Promise<AuthResponse> {
        const { phone, otp } = input;
        const redis = this.redisService.getClient();

        const storedOtp = await redis.get<string | number>(RedisKeys.otp(phone));

        if (!storedOtp || String(storedOtp) !== otp.trim()) {
            throw new UnauthorizedError('Invalid or expired OTP');
        }

        // Delete OTP after verification
        await redis.del(RedisKeys.otp(phone));

        // Find or Create User
        let user = await this.userService.findByPhone(phone);

        if (!user) {
            // Create new user
            // We need a username. Let's generate one or ask for it?
            // For now, let's generate a random one based on phone
            const username = `user_${phone.slice(-4)}_${Math.floor(Math.random() * 1000)}`;
            user = await this.userService.createNewUser({
                phone,
                username,
            });
        }

        const tokens = await this.generateTokens(user.id, user.username);
        await this.updateRefreshToken(user.id, tokens.refreshToken);

        return {
            user: user as any,
            ...tokens,
        };
    }

    async logout(userId: string): Promise<boolean> {
        const redis = this.redisService.getClient();
        await redis.del(RedisKeys.refreshToken(userId));
        return true;
    }

    async refreshTokens(userId: string, rt: string): Promise<RefreshTokenResponse> {
        const redis = this.redisService.getClient();
        const storedRt = await redis.get<string>(RedisKeys.refreshToken(userId));

        if (!storedRt) {
            throw new UnauthorizedError('Access Denied');
        }

        const isMatch = await bcrypt.compare(rt, storedRt);
        if (!isMatch) {
            throw new UnauthorizedError('Access Denied');
        }

        const user = await this.userService.getUser(userId);
        const tokens = await this.generateTokens(user.id, user.username);
        await this.updateRefreshToken(user.id, tokens.refreshToken);

        return tokens;
    }

    async updateRefreshToken(userId: string, rt: string): Promise<void> {
        const hash = await bcrypt.hash(rt, 10);
        const redis = this.redisService.getClient();
        // Store hashed RT in Redis with 7d expiry
        await redis.set(RedisKeys.refreshToken(userId), hash, { ex: 60 * 60 * 24 * 7 });
    }

    async generateTokens(userId: string, username: string) {
        const [at, rt] = await Promise.all([
            this.jwtService.signAsync(
                { sub: userId, username },
                {
                    secret: this.configService.get('JWT_SECRET'),
                    expiresIn: this.configService.get('JWT_EXPIRES_IN'),
                },
            ),
            this.jwtService.signAsync(
                { sub: userId, username },
                {
                    secret: this.configService.get('JWT_REFRESH_SECRET'),
                    expiresIn: this.configService.get('JWT_REFRESH_EXPIRES_IN'),
                },
            ),
        ]);

        return {
            accessToken: at,
            refreshToken: rt,
        };
    }
}
