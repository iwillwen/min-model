/// <reference types="node" />
import { EventEmitter } from 'events';
import { MinDB } from 'min';
export default class BaseIndexer extends EventEmitter {
    private sequence;
    private prefix;
    key: string;
    private min;
    private ready;
    constructor(sequence: string, prefix: string, key: string, min: MinDB);
    map(): Promise<void>;
    add(key: string, val: any): Promise<void>;
    remove(key: string, val: any): Promise<void>;
    reindex(key: string, newValue: any, oldValue: any): Promise<void>;
    private _search;
    search(query: any, chainData?: any[]): Promise<any[]>;
    indexMapper(value: any): any[];
}
