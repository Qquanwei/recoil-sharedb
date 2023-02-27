import { Doc } from 'sharedb/lib/client';
import { DefaultValue } from 'recoil';
import * as json1 from 'ot-json1';
import config from './config';

export function readDoc(doc: Doc, callback: ((a: Doc) => void)) {
    if (doc.type) {
        return doc.data;
    }
    return new Promise((resolve, reject) => {
        doc.subscribe((error: any) => {
            if (error) {
                console.error(error);
                reject(error);
            } else {
                if (doc.type) {
                    resolve(doc.data);
                } else {
                    resolve(new DefaultValue());
                }
                if (callback) {
                    callback(doc);
                }
            }
        });
    });
}

export function writeOrCreate<T>(doc: Doc, value: T) {
    if (value instanceof DefaultValue) {
        return;
    }

    if (!doc.type) {
        doc.create(value, config.otName, ((error: any) => {
            if (error) {
                console.error('->', error);
            }
        }));
    } else {
        if (value !== doc.data) {
            const path = diffToPath(doc.data, value);
            // 不替换
            if (path === null) {
                return null;
            }
            // 整个对象替换
            if (path.length === 0) {
                doc.submitOp(json1.replaceOp([], true, value));
                return;
            }
            // 有一个属性变了
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

// 返回 [] 表示对整个对象替换
// 返回 null 表示不替换
export function diffToPath(src: any, modify: any, checkMap = new Map()) {
    if (src === modify) {
        return null;
    }
    if (typeof src !== 'object' && typeof modify !== 'object') {
        return [];
    }

    // 如果 src/modify 是 undefined, 则整个替换
    if (src === undefined || modify === undefined || src === null || modify === null) {
        return [];
    }

    if (checkMap.has(src) || checkMap.has(modify)) {
        throw new Error('diffToPath 存在循环引用');
    }

    // 类型变更时直接替换
    if (
        (Array.isArray(src) && !Array.isArray(modify)) || (!Array.isArray(src) && Array.isArray(modify))
    ) {
        return [];
    }

    // 数组有时候会整体替换
    if (Array.isArray(src) && Array.isArray(modify)) {
        if (src.length === 0 && modify.length === 0) {
            return null;
        }

        if (modify.length === 0) {
            return [];
        }
    }


    checkMap.set(src, true);
    checkMap.set(modify, true);


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
        k.map((subroute: string|string[]) => {
            res.push(
                keyToNumber(([] as any).concat(srck, subroute))
            );
        });
    });
    if (res.length === 0) {
        return null;
    }
    return res;

}
