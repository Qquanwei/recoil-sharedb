export function buildItemKey(collection: string, key: string) {
    return JSON.stringify({
        collection,
        key
    });
}

export function parseItemKey(itemKey: string) {
    try {
        return JSON.parse(itemKey);
    } catch(e) {
        throw new Error('key not legal');
    }
}
