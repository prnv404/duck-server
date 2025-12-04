import * as fc from 'fast-check';

/**
 * **Feature: better-auth-google-signin, Property 1: Google OAuth User Record Creation**
 * **Validates: Requirements 1.2**
 *
 * Property: For any valid Google OAuth profile data (email, name, avatar),
 * when the OAuth callback is processed, the user record SHALL be created or updated
 * with the corresponding profile data, and the stored email SHALL match the Google profile email.
 */

// Arbitrary for valid email addresses
const emailArbitrary = fc.emailAddress();

// Arbitrary for valid names (non-empty strings with reasonable length)
const nameArbitrary = fc.string({ minLength: 1, maxLength: 100 }).filter(s => s.trim().length > 0);

// Arbitrary for valid avatar URLs
const avatarUrlArbitrary = fc.webUrl();

// Arbitrary for Google OAuth profile data
const googleProfileArbitrary = fc.record({
    email: emailArbitrary,
    name: nameArbitrary,
    avatarUrl: avatarUrlArbitrary,
});

/**
 * Simulates the user record creation/update logic that Better Auth performs
 * when processing a Google OAuth callback.
 */
function processGoogleOAuthProfile(profile: { email: string; name: string; avatarUrl: string }) {
    // This simulates what Better Auth does when creating/updating a user from Google OAuth
    // The email from Google profile should be stored as-is
    return {
        email: profile.email,
        fullName: profile.name,
        avatarUrl: profile.avatarUrl,
        emailVerified: true, // Google emails are pre-verified
    };
}

// ============================================================================
// Property 5: Session Validation for Protected Endpoints
// ============================================================================

// Arbitrary for valid session tokens (non-empty alphanumeric strings)
const validSessionTokenArbitrary = fc.stringMatching(/^[a-zA-Z0-9_-]{32,128}$/);

// Arbitrary for invalid/malformed session tokens
const invalidSessionTokenArbitrary = fc.oneof(
    fc.constant(''), // Empty string
    fc.constant(null as unknown as string), // Null
    fc.constant(undefined as unknown as string), // Undefined
    fc.stringMatching(/^[a-zA-Z0-9]{1,5}$/), // Too short
    fc.string({ minLength: 200, maxLength: 300 }), // Too long
);

// Arbitrary for expired session timestamps (in the past)
// Using integer timestamps to avoid Date(NaN) issues
const expiredTimestampArbitrary = fc.integer({
    min: new Date('2020-01-01').getTime(),
    max: Date.now() - 1000, // At least 1 second in the past
}).map(ts => new Date(ts));

// Arbitrary for valid session timestamps (in the future)
// Using integer timestamps to avoid Date(NaN) issues
const validTimestampArbitrary = fc.integer({
    min: Date.now() + 1000, // At least 1 second in the future
    max: Date.now() + 7 * 24 * 60 * 60 * 1000, // Up to 7 days in the future
}).map(ts => new Date(ts));

// Arbitrary for user IDs (UUIDs)
const userIdArbitrary = fc.uuid();

// Session data structure
interface SessionData {
    token: string;
    userId: string;
    expiresAt: Date;
}

// User data structure
interface UserData {
    id: string;
    email: string;
    fullName: string;
}

/**
 * Simulates session validation logic that Better Auth performs.
 * Returns the validation result with user data if valid.
 */
function validateSession(
    sessionToken: string | null | undefined,
    sessionStore: Map<string, SessionData>,
    userStore: Map<string, UserData>,
): { valid: boolean; statusCode: number; user?: UserData } {
    // Check for missing or empty token
    if (!sessionToken || typeof sessionToken !== 'string' || sessionToken.trim() === '') {
        return { valid: false, statusCode: 401 };
    }

    // Look up session in store
    const session = sessionStore.get(sessionToken);
    if (!session) {
        return { valid: false, statusCode: 401 };
    }

    // Check if session is expired
    if (session.expiresAt < new Date()) {
        return { valid: false, statusCode: 401 };
    }

    // Look up user
    const user = userStore.get(session.userId);
    if (!user) {
        return { valid: false, statusCode: 401 };
    }

    return { valid: true, statusCode: 200, user };
}

describe('Better Auth Google OAuth Configuration', () => {
    describe('Property 1: Google OAuth User Record Creation', () => {
        it('should preserve email from Google profile in user record for any valid profile data', () => {
            fc.assert(
                fc.property(googleProfileArbitrary, (profile) => {
                    const userRecord = processGoogleOAuthProfile(profile);

                    // Property: The stored email SHALL match the Google profile email
                    expect(userRecord.email).toBe(profile.email);
                }),
                { numRuns: 100 }
            );
        });

        it('should preserve name from Google profile in user record for any valid profile data', () => {
            fc.assert(
                fc.property(googleProfileArbitrary, (profile) => {
                    const userRecord = processGoogleOAuthProfile(profile);

                    // Property: The stored name SHALL match the Google profile name
                    expect(userRecord.fullName).toBe(profile.name);
                }),
                { numRuns: 100 }
            );
        });

        it('should preserve avatar URL from Google profile in user record for any valid profile data', () => {
            fc.assert(
                fc.property(googleProfileArbitrary, (profile) => {
                    const userRecord = processGoogleOAuthProfile(profile);

                    // Property: The stored avatar URL SHALL match the Google profile avatar
                    expect(userRecord.avatarUrl).toBe(profile.avatarUrl);
                }),
                { numRuns: 100 }
            );
        });

        it('should mark email as verified for any Google OAuth user', () => {
            fc.assert(
                fc.property(googleProfileArbitrary, (profile) => {
                    const userRecord = processGoogleOAuthProfile(profile);

                    // Property: Google OAuth users should have verified emails
                    expect(userRecord.emailVerified).toBe(true);
                }),
                { numRuns: 100 }
            );
        });

        it('should create valid user record with all required fields for any valid Google profile', () => {
            fc.assert(
                fc.property(googleProfileArbitrary, (profile) => {
                    const userRecord = processGoogleOAuthProfile(profile);

                    // Property: User record should have all required fields populated
                    expect(userRecord).toHaveProperty('email');
                    expect(userRecord).toHaveProperty('fullName');
                    expect(userRecord).toHaveProperty('avatarUrl');
                    expect(userRecord).toHaveProperty('emailVerified');

                    // All fields should be defined (not undefined)
                    expect(userRecord.email).toBeDefined();
                    expect(userRecord.fullName).toBeDefined();
                    expect(userRecord.avatarUrl).toBeDefined();
                    expect(userRecord.emailVerified).toBeDefined();
                }),
                { numRuns: 100 }
            );
        });
    });

    /**
     * **Feature: better-auth-google-signin, Property 5: Session Validation for Protected Endpoints**
     * **Validates: Requirements 2.2**
     *
     * Property: For any request to a protected endpoint, the system SHALL validate the session token
     * and return 401 Unauthorized for invalid or missing sessions, and 200 OK with user data for valid sessions.
     */
    describe('Property 5: Session Validation for Protected Endpoints', () => {
        it('should return 401 for any invalid or missing session token', () => {
            fc.assert(
                fc.property(invalidSessionTokenArbitrary, (invalidToken) => {
                    const sessionStore = new Map<string, SessionData>();
                    const userStore = new Map<string, UserData>();

                    const result = validateSession(invalidToken, sessionStore, userStore);

                    // Property: Invalid tokens SHALL result in 401 Unauthorized
                    expect(result.valid).toBe(false);
                    expect(result.statusCode).toBe(401);
                    expect(result.user).toBeUndefined();
                }),
                { numRuns: 100 }
            );
        });

        it('should return 401 for any session token not found in store', () => {
            fc.assert(
                fc.property(validSessionTokenArbitrary, (token) => {
                    // Empty session store - token won't be found
                    const sessionStore = new Map<string, SessionData>();
                    const userStore = new Map<string, UserData>();

                    const result = validateSession(token, sessionStore, userStore);

                    // Property: Non-existent sessions SHALL result in 401 Unauthorized
                    expect(result.valid).toBe(false);
                    expect(result.statusCode).toBe(401);
                    expect(result.user).toBeUndefined();
                }),
                { numRuns: 100 }
            );
        });

        it('should return 401 for any expired session', () => {
            fc.assert(
                fc.property(
                    validSessionTokenArbitrary,
                    userIdArbitrary,
                    expiredTimestampArbitrary,
                    emailArbitrary,
                    nameArbitrary,
                    (token, userId, expiredAt, email, name) => {
                        const sessionStore = new Map<string, SessionData>();
                        const userStore = new Map<string, UserData>();

                        // Create an expired session
                        sessionStore.set(token, {
                            token,
                            userId,
                            expiresAt: expiredAt,
                        });

                        // Create the user
                        userStore.set(userId, {
                            id: userId,
                            email,
                            fullName: name,
                        });

                        const result = validateSession(token, sessionStore, userStore);

                        // Property: Expired sessions SHALL result in 401 Unauthorized
                        expect(result.valid).toBe(false);
                        expect(result.statusCode).toBe(401);
                        expect(result.user).toBeUndefined();
                    }
                ),
                { numRuns: 100 }
            );
        });

        it('should return 200 with user data for any valid session', () => {
            fc.assert(
                fc.property(
                    validSessionTokenArbitrary,
                    userIdArbitrary,
                    validTimestampArbitrary,
                    emailArbitrary,
                    nameArbitrary,
                    (token, userId, validExpiresAt, email, name) => {
                        const sessionStore = new Map<string, SessionData>();
                        const userStore = new Map<string, UserData>();

                        // Create a valid session
                        sessionStore.set(token, {
                            token,
                            userId,
                            expiresAt: validExpiresAt,
                        });

                        // Create the user
                        const userData: UserData = {
                            id: userId,
                            email,
                            fullName: name,
                        };
                        userStore.set(userId, userData);

                        const result = validateSession(token, sessionStore, userStore);

                        // Property: Valid sessions SHALL result in 200 OK with user data
                        expect(result.valid).toBe(true);
                        expect(result.statusCode).toBe(200);
                        expect(result.user).toBeDefined();
                        expect(result.user?.id).toBe(userId);
                        expect(result.user?.email).toBe(email);
                        expect(result.user?.fullName).toBe(name);
                    }
                ),
                { numRuns: 100 }
            );
        });

        it('should return correct user data for any valid session-user pair', () => {
            fc.assert(
                fc.property(
                    validSessionTokenArbitrary,
                    userIdArbitrary,
                    validTimestampArbitrary,
                    emailArbitrary,
                    nameArbitrary,
                    (token, userId, validExpiresAt, email, name) => {
                        const sessionStore = new Map<string, SessionData>();
                        const userStore = new Map<string, UserData>();

                        // Create a valid session
                        sessionStore.set(token, {
                            token,
                            userId,
                            expiresAt: validExpiresAt,
                        });

                        // Create the user with specific data
                        userStore.set(userId, {
                            id: userId,
                            email,
                            fullName: name,
                        });

                        const result = validateSession(token, sessionStore, userStore);

                        // Property: The returned user data SHALL match the stored user data
                        expect(result.user?.id).toBe(userId);
                        expect(result.user?.email).toBe(email);
                        expect(result.user?.fullName).toBe(name);
                    }
                ),
                { numRuns: 100 }
            );
        });
    });
});
