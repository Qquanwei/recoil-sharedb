import React, {
    useMemo,
    Suspense,
    useCallback, useEffect, useImperativeHandle, useRef } from 'react';
import { useRecoilSnapshot } from 'recoil';
import { RecoilSync } from 'recoil-sync';
import WebSocket from 'reconnecting-websocket';
import Client, { Connection, Doc } from 'sharedb/lib/client';
import Deferred from 'deferred';
import * as json1 from 'ot-json1';
import { parseItemKey  } from './key';
import { readDoc, writeOrCreate } from './sharedb-utils';
import config from './config';

Client.types.register(json1.type);

interface IRecoilSyncShareDBProps {
    wsUrl: string;
    children: JSX.Element;
};

export const Context = React.createContext({});

const RecoilSyncShareDB: React.FC<IRecoilSyncShareDBProps> = React.forwardRef(({
    children,
    wsUrl
}, forwardRef) => {
    const connectionRef = useRef<Connection|null>(null);
    const updateItemRef = useRef(null);
    const updateAllKnownItemsRef = useRef(null);
    const isTimeRef = useRef(false);

    const listenNewDoc = useCallback((doc: Doc) => {
        doc.on('op', () => {
            console.log('doc op', doc.data.id);
        })
    }, []);

    const defCon = useMemo(() => {
        return new Deferred();
    }, []);

    useEffect(() => {
        const socket = new WebSocket(wsUrl);

        socket.addEventListener('open', () => {
            connectionRef.current = new Connection(socket);
            connectionRef.current.on('doc', listenNewDoc);
            defCon.resolve(connectionRef.current);
        });

        // RecoilSync 会在第一次时触发一次 write, 我们不希望这样，所以第一次write可以忽略
        isTimeRef.current = true;

        return () => {
            isTimeRef.current = false;
            socket.close();
            if (connectionRef.current) {
                connectionRef.current.close();
            }
        }
    }, []);

    const read = useCallback((itemKey: string) => {
        const { collection, key, ...props } = parseItemKey(itemKey);

        const readWork = (con: Connection) => {
            const doc = con.get(collection, key);
            return readDoc(doc);
        }

        if (connectionRef.current) {
            return readWork(connectionRef.current);
        }

        return Promise.resolve(defCon.promise).then(readWork);
    }, []);

    const write = useCallback(({ diff }: any) => {
        if (!isTimeRef.current) {
            return;
        }

        function doWork(con: Connection) {
            for (const [itemKey, value] of diff) {
                const { collection, key } = parseItemKey(itemKey);
                const doc = con.get(collection, key);
                writeOrCreate(doc, value);
            }
        }
        if (connectionRef.current) {
            return doWork(connectionRef.current);
        }

        return defCon.promise.then((con: Connection) => {
            doWork(con);
        });
    }, []);

    const listen = useCallback(({ updateItem, updateAllKnownItems}: any) => {
        updateItemRef.current = updateItem;
        updateAllKnownItemsRef.current = updateAllKnownItems;
    }, []);

    return (
        <RecoilSync
            storeKey={config.storeKey}
            read={read}
            write={write}
            listen={listen}>
            <Context.Provider value={connectionRef}>
                <Suspense>
                    { children }
                </Suspense>
            </Context.Provider>
        </RecoilSync>
    );
});

export {
    RecoilSyncShareDB
};
