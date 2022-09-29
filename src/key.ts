export function buildItemKey(collection: string, key: string) {
    return `${collection}-${key}`;
}

export function parseItemKey(itemKey: string) {
    const index = itemKey.indexOf('-');
    if (index === -1) {
        throw new Error('key not legal');
    }

    return {
        collection: itemKey.slice(0, index),
        key: itemKey.slice(index + 1)
    };
}
