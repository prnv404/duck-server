import { Injectable, Scope } from '@nestjs/common';
import DataLoader from 'dataloader';

@Injectable({ scope: Scope.REQUEST })
export class DataLoaderService {
    private loaders: Map<string, DataLoader<any, any>> = new Map();

    createLoader<K, V>(key: string, batchFn: DataLoader.BatchLoadFn<K, V>): DataLoader<K, V> {
        if (!this.loaders.has(key)) {
            this.loaders.set(key, new DataLoader(batchFn));
        }
        return this.loaders.get(key)!;
    }

    getLoader<K, V>(key: string): DataLoader<K, V> | undefined {
        return this.loaders.get(key);
    }
}
