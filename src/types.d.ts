declare module 'recoil-sync';
declare module 'reconnecting-websocket';
declare module 'deferred';
declare module 'ot-json1';


interface IUpdateItem {
    (itemKey: string, newValue: any): void
};
