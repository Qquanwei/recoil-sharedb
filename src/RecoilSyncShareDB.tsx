import React, {
    useMemo,
    Suspense,
    useCallback, useEffect, useRef } from 'react';
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

const RecoilSyncShareDB: React.FC<IRecoilSyncShareDBProps> = ({
    children,
    wsUrl,
    onError,
    ...mapProps
}) => {
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
        doc.on('op', (op) => {
            const k = atomKeyMap.get(`${doc.collection}.${doc.id}`);
            if (updateItemRef.current && k) {
                // recoil-sync 有个bug，会导致updateItemRef触发write
                // 当两个连续的更新到达时触发
                // FIXME 需要给上游提交bugfix
                // setTimeout 为临时解决方案
                setTimeout(() => {
                    (updateItemRef.current as any)(k, doc.data);
                });
            }
        });

        doc.on('error', (e) => {
            doc.removeAllListeners('op');
            doc.removeAllListeners('error');
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
            return readDoc(doc, listenNewDoc);
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
};

export {
    RecoilSyncShareDB
};
