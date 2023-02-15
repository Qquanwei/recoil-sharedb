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

export const MapPropsProvider = React.createContext({});

interface IRecoilSyncShareDBProps {
    wsUrl: string;
    children: JSX.Element;
    onError: (e: any) => void;
};

export const Context = React.createContext<any>({});

const RecoilSyncShareDB: React.FC<IRecoilSyncShareDBProps> = React.forwardRef(({
    children,
    wsUrl,
    onError,
    ...mapProps
}, forwardRef) => {
    const connectionRef = useRef<Connection|null>(null);
    const updateItemRef = useRef(null);
    const updateAllKnownItemsRef = useRef(null);
    const isTimeRef = useRef(false);
    const onErrorRef = useRef<Function|null>(null);
    const atomKeyMap = useMemo(() => {
        return new Map();
    }, []);

    onErrorRef.current = onError;

    const listenNewDoc = useCallback((doc: Doc) => {
        doc.subscribe();
        doc.on('op', (op) => {
            const k = atomKeyMap.get(`${doc.collection}.${doc.id}`);
            if (updateItemRef.current && k) {
                (updateItemRef.current as any)(k, doc.data);
            }
        });

        doc.on('error', (e) => {
            if (onErrorRef.current) {
                onErrorRef.current(e);
            } else {
                console.error(e);
            }
        });
    }, []);

    const defCon = useMemo(() => {
        return new Deferred();
    }, []);

    useEffect(() => {
        const socket = new WebSocket(wsUrl);

        socket.addEventListener('open', () => {
            if (connectionRef.current) {
                // 重新订阅
                Object.keys((connectionRef.current as any).collections).forEach(key => {
                    Object.keys((connectionRef.current as any).collections[key]).forEach(docId => {
                        (connectionRef.current as any).collections[key][docId].subscribe();
                    });
                });
                (connectionRef.current as any).bindToSocket(socket);
            } else {
                connectionRef.current = new Connection(socket);
                defCon.resolve(connectionRef.current);

                connectionRef.current.on('error', (error) => {
                    console.error('error', error);
                });
                connectionRef.current.on('connection error', (error) => {
                    console.error('connection error', error);
                });
            }
        });

        return () => {
            socket.close();
            if (connectionRef.current) {
                connectionRef.current.close();
                connectionRef.current = null;
            }
        }
    }, []);

    const read = useCallback((itemKey: string) => {
        const { collection, key, ...props } = parseItemKey(itemKey, mapProps);
        atomKeyMap.set(`${collection}.${key}`, itemKey);

        const readWork = (con: Connection) => {
            const doc = con.get(collection, key);
            listenNewDoc(doc);
            return readDoc(doc);
        }

        if (connectionRef.current) {
            return readWork(connectionRef.current);
        }

        return Promise.resolve(defCon.promise).then(readWork);
    }, [mapProps]);

    const write = useCallback(({ diff }: any) => {
        function doWork(con: Connection) {
            for (const [itemKey, value] of diff) {
                const { collection, key } = parseItemKey(itemKey, mapProps);
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
    }, [mapProps]);

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
            <MapPropsProvider.Provider value={mapProps}>
                <Context.Provider value={connectionRef}>
                    <Suspense>
                        { children }
                    </Suspense>
                </Context.Provider>
            </MapPropsProvider.Provider>
        </RecoilSync>
    );
});

export {
    RecoilSyncShareDB
};
