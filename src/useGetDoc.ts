import { useCallback, useContext } from 'react';
import { useConnectionRef } from './useConnectionRef';
import { MapPropsProvider } from './RecoilSyncShareDB';
import { parseItemKey, buildItemKey  } from './key';

export function useGetDoc() {
    const connectionRef = useConnectionRef();
    const props = useContext(MapPropsProvider);

    return useCallback((collection: string, id: string) => {
        const data = parseItemKey(buildItemKey(collection, id), props);
        return connectionRef.current.get(data.collection, data.key);
    }, []);
}
