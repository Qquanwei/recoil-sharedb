import { Doc } from 'sharedb/lib/client';
import * as json1 from 'ot-json1';
import config from './config';

export function readDoc(doc: Doc) {
    if (doc.type) {
        return doc.data;
    }
    return new Promise((resolve, reject) => {
        doc.subscribe((error: any) => {
            if (error) {
                reject(error);
            } else {
                resolve(doc.data || []);
            }
        });
    });
}

export function writeOrCreate<T>(doc: Doc, value: T) {
    if (!doc.type) {
        doc.create(value, config.otName, ((error: any) => {
            if (error) {
                console.error('->', error);
            }
        }));
    } else {
        if (value !== doc.data) {
            const path = diffToPath(doc.data, value);
            if (path === null) {
                return null;
            }
            if (path.length === 0) {
                doc.submitOp(json1.replaceOp([], true, value));
                return;
            }
            if (path.length === 1) {
                doc.submitOp(json1.replaceOp(path[0], get(path[0], doc.data), get(path[0], value)));
                return;
            }
            const op = path.map((p: string[]) => {
                return json1.replaceOp(p, get(p, doc.data), get(p, value))
            }).reduce(json1.type.compose, null);
            doc.submitOp(op);
        }
    }
}

function get(path: string[], obj: Record<string, any>) {
    return path.reduce((obj, p) => {
        return obj[p];
    }, obj);
}

function keyToNumber(k: string[]) {
    return k.map(kk => {
        if (Number(kk) === Number(kk)) {
            return Number(kk);
        }
        return kk;
    })
}

function diffToPath(src: any, modify: any, checkMap = new Map()) {

    if (checkMap.has(src) || checkMap.has(modify)) {
        throw new Error('diffToPath 存在循环引用');
    }

    checkMap.set(src, true);
    checkMap.set(modify, true);

    if (src && modify && typeof src === 'object' && typeof modify === 'object') {
        let res: any = [];
        new Set<string>(([] as any).concat(
            Object.keys(modify),
            Object.keys(src)
        )).forEach((srck: string) => {
            const k = diffToPath(src[srck], modify[srck]);
            if (k === null) {
                return;
            }
            if (k.length === 0) {
                res.push(keyToNumber([srck]));
                return;
            }
            return k.map((subroute: string|string[]) => {
                return keyToNumber(([] as any).concat(srck, subroute));
            });
        });
        if (res.length === 0) {
            return null;
        }
        return res;
    }
    if (src === modify) {
        // 不替换
        return null;
    }

    // 整个对象替换
    return [];
}
