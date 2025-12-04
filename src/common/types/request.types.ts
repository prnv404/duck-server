import { Request } from 'express';

/**
 * Authenticated user from Better Auth session
 * This matches the User entity structure returned by Better Auth
 */
export interface AuthenticatedUser {
    id: string;
    email: string;
    emailVerified: boolean;
    name: string;
    image?: string | null;
    createdAt: Date;
    updatedAt: Date;
    // Additional fields from your schema
    username?: string;
    phone?: string | null;
    fullName?: string | null;
    targetExam?: string | null;
    notificationEnabled?: boolean;
    lastActiveAt?: Date | null;
}

/**
 * Extended Express Request with authenticated user
 * Note: Prefer using @Session() decorator from @thallesp/nestjs-better-auth
 */
export interface AuthenticatedRequest extends Request {
    user: AuthenticatedUser;
}
