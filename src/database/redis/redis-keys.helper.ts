/**
 * Redis key prefixes and helper functions for consistent key naming
 */

export const RedisKeyPrefix = {
    OTP: 'otp',
    REFRESH_TOKEN: 'refresh_token',
    // Add more prefixes as needed
    // SESSION: 'session',
    // USER_CACHE: 'user_cache',
} as const;

/**
 * Helper class for generating Redis keys with consistent prefixes
 */
export class RedisKeys {
    /**
     * Generate OTP key for a phone number
     * @param phone - Phone number
     * @returns Redis key: "otp:{phone}"
     */
    static otp(phone: string): string {
        return `${RedisKeyPrefix.OTP}:${phone}`;
    }

    /**
     * Generate refresh token key for a user
     * @param userId - User ID
     * @returns Redis key: "refresh_token:{userId}"
     */
    static refreshToken(userId: string): string {
        return `${RedisKeyPrefix.REFRESH_TOKEN}:${userId}`;
    }

    // Add more helper methods as needed
    // static session(sessionId: string): string {
    //   return `${RedisKeyPrefix.SESSION}:${sessionId}`;
    // }

    // static userCache(userId: string): string {
    //   return `${RedisKeyPrefix.USER_CACHE}:${userId}`;
    // }
}
