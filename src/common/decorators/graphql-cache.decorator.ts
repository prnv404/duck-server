import { SetMetadata } from '@nestjs/common';

export const CACHE_KEY = 'cache_ttl';

export const GraphqlCache = (ttl: number) => SetMetadata(CACHE_KEY, ttl);
