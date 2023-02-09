import { useContext, useCallback } from 'react';
import * as json1 from 'ot-json1';
import { useConnectionRef } from './useConnectionRef';
import { parseItemKey  } from './key';
import { MapPropsProvider } from './RecoilSyncShareDB';

export function useArraySwap()  {
    const connectionRef = useConnectionRef();
    const mapProps = useContext(MapPropsProvider);

    return useCallback((keyName: string, fromIdx: Array<any>, toIdx: Array<any>) => {
        const { collection, key } = parseItemKey(keyName, mapProps);
        const doc = connectionRef.current.get(collection, key);
        doc.submitOp(json1.moveOp(fromIdx, toIdx));
    }, []);
}
