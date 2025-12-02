import { Request } from 'express';

/**
 * Payload stored inside the JWT token
 */
export interface JwtTokenPayload {
    sub: string;
    username: string;
    iat?: number;
    exp?: number;
}

/**
 * Authenticated user attached to the request (from JwtStrategy)
 * This matches the User entity structure returned by UserService
 */
export interface AuthenticatedUser {
    id: string;
    username: string;
    phone: string;
    fullName?: string | null;
    // Add other fields as needed, or make it partial User
}

/**
 * Extended Express Request with authenticated user
 */
export interface AuthenticatedRequest extends Request {
    user: AuthenticatedUser;
}
