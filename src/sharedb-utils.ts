import { Doc } from 'sharedb/lib/client';
import * as json1 from 'ot-json1';
import config from './config';

export function readDoc(doc: Doc) {
    if (doc.type) {
        return doc.data;
    }
    return new Promise((resolve, reject) => {
        doc.fetch((error: any) => {
            console.log('subscribe 出现了', error, doc);
            if (error) {
                reject(error);
            } else {
                resolve(doc.data || []);
            }
        });
    });
}


export function writeOrCreate<T>(doc: Doc, value: T) {
    return new Promise((resolve, reject) => {
        if (!doc.type) {
            doc.fetch(() => {
                doc.create(value, config.otName, ((error: any) => {
                    if (error) {
                        reject(error);
                        console.error('->', error);
                    }
                }));
            });
        } else {
            if (value !== doc.data) {
                doc.submitOp(json1.replaceOp([], true, value));
            }
        }
    });
}
