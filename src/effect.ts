import { syncEffect } from 'recoil-sync';
import config from './config';
import { buildItemKey } from './key';

type optionType =  Omit<Parameters<typeof syncEffect>[0], "storeKey" | "itemKey">;

export function effect(
    collectionType: string,
    key: string,
    options: optionType
) {
    return syncEffect({
        ...options,
        storeKey: config.storeKey,
        itemKey: buildItemKey(collectionType, key)
    });
}
