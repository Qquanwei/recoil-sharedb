export function buildItemKey(collection: string, key: string) {
    return JSON.stringify({
        collection,
        key
    });
}

function isVariableKey(str: string) {
    return /^\<.*\>$/.test(str);
}

function extractVariableProp(str: string) {
    return str.slice(1, -1);
}

export function parseItemKey(itemKey: string, props: any = {}) {
    try {
        const data = JSON.parse(itemKey);

        if (isVariableKey(data.collection)) {
            data.collection = props[extractVariableProp(data.collection)];
        }

        if (isVariableKey(data.key)) {
            data.key = props[extractVariableProp(data.key)];
        }

        return data;
    } catch(e) {
        throw new Error('key not legal');
    }
}
