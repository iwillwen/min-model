/// <reference types="node" />
export { default as BaseIndexer } from './base-indexer';
import { EventEmitter } from 'events';
import BaseIndexer from './base-indexer';
import { MinDB } from 'min';
export declare type Constructor = StringConstructor | NumberConstructor | BooleanConstructor | ObjectConstructor | ArrayConstructor | DateConstructor | ErrorConstructor;
export default class Index extends EventEmitter {
    private ready;
    private indexer;
    constructor(sequence: string, prefix: string, key: string, type: string | Constructor, min: MinDB);
    awaitForReady(): Promise<boolean>;
    add(key: string, value: any): Promise<void>;
    remove(key: string, value: any): Promise<void>;
    reindex(key: string, newValue: any, oldValue: any): Promise<void>;
    search(query: any, chainData?: any[]): Promise<any[]>;
}
export declare function setIndexer(type: string | Constructor, indexerCtor: typeof BaseIndexer): void;
export declare function setIndexerForColumn(key: string, indexerCtor: typeof BaseIndexer): void;
