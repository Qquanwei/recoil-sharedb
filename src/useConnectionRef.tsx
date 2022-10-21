import { useContext } from 'react';
import { Context } from './RecoilSyncShareDB';

export function useConnectionRef() {
    return useContext(Context);
}
