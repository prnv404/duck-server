import { SetMetadata } from '@nestjs/common';

/**
 * Decorator to mark routes as public (bypass authentication)
 */
export const IS_PUBLIC_KEY = 'isPublic';
export const Public = () => SetMetadata(IS_PUBLIC_KEY, true);
