import React, {
    useMemo,
    useCallback, useEffect, useImperativeHandle, useRef } from 'react';
import { RecoilSync } from 'recoil-sync';
import WebSocket from 'reconnecting-websocket';
import Client, { Connection } from 'sharedb/lib/client';
import Deferred from 'deferred';
import * as json1 from 'ot-json1';
import { parseItemKey  } from './key';
import { readAndSubscribe, writeOrCreate } from './sharedb-utils';
import config from './config';

Client.types.register(json1.type);

interface IRecoilSyncShareDBProps {
    wsUrl: string;
    children: JSX.Element;
};

const RecoilSyncShareDB: React.FC<IRecoilSyncShareDBProps> = React.forwardRef(({
    children,
    wsUrl
}, forwardRef) => {
    const connectionRef = useRef<Connection|null>(null);

    const defCon = useMemo(() => {
        return new Deferred();
    }, []);

    useEffect(() => {
        const socket = new WebSocket(wsUrl);

        socket.addEventListener('open', () => {
            connectionRef.current = new Connection(socket);
            defCon.resolve(connectionRef.current);
        });

        return () => {
            socket.close();
        }

    }, []);

    const read = useCallback((itemKey: string) => {
        const readWork = (con: Connection) => {
            const { collection, key } = parseItemKey(itemKey);
            const doc = con.get(collection, key);
            return readAndSubscribe(doc);
        }

        return Promise.resolve(defCon.promise).then(readWork);
    }, []);

    const write = useCallback(({ diff }: any) => {
        return defCon.promise.then((con: Connection) => {
            for (const [itemKey, value] of diff) {
                const { collection, key } = parseItemKey(itemKey);
                const doc = con.get(collection, key);
                writeOrCreate(doc, value);
            }
        });
    }, []);

    const listen = useCallback(() => {
    }, []);

    return (
        <RecoilSync
            storeKey={config.storeKey}
            read={read}
            write={write}
            listen={listen}>
            { children }
        </RecoilSync>
    );
});

export {
    RecoilSyncShareDB
};
