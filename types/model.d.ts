/// <reference types="node" />
import { EventEmitter } from 'events';
import { MinDB } from 'min';
import { default as Indexer, BaseIndexer, Constructor } from './indexer';
import Queue from './queue';
declare const cacheSymbol: unique symbol;
declare const indexersSymbol: unique symbol;
export interface IMethods {
    beforeValidate?(content: {
        [column: string]: any;
    }): any;
    beforeStore?(): any;
    ready?(): any;
    beforeUpdate?(key: string, value: any, oldValue: any): any;
    afterUpdate?(key: string, value: any, oldValue: any): any;
    beforeRemove?(key: string): void;
    afterRemove?(key: string): void;
}
export default class Model extends EventEmitter {
    static min: MinDB;
    static sequence: string;
    static prefix: string;
    static [indexersSymbol]: Map<string, Indexer>;
    static use(min: MinDB): void;
    static readonly BaseIndexer: typeof BaseIndexer;
    static setIndexer(type: string | Constructor, indexerCtor: typeof BaseIndexer): void;
    static setIndexerForColumn(key: string, indexerCtor: typeof BaseIndexer): void;
    static extend(name: string, columns: {
        [column: string]: any;
    }): {
        new (key: string, content?: {
            [column: string]: any;
        }): {
            readonly $methods: {
                [column: string]: Function;
            };
            readonly [Symbol.toStringTag]: string;
            readonly min: MinDB;
            readonly queue: Queue;
            key: string;
            runLifecycle(content?: {
                [column: string]: any;
            }): void;
            getCacheData(key?: string): any;
            readonly hashKey: string;
            validate(key: string, value: any): boolean;
            get(key: string): Promise<any>;
            set(key: string, value: any): Promise<any[]>;
            reset(key?: string): Promise<any[]>;
            remove(): Promise<void>;
            [cacheSymbol]: {
                [column: string]: any;
            };
            addListener(event: string | symbol, listener: (...args: any[]) => void): any;
            on(event: string | symbol, listener: (...args: any[]) => void): any;
            once(event: string | symbol, listener: (...args: any[]) => void): any;
            prependListener(event: string | symbol, listener: (...args: any[]) => void): any;
            prependOnceListener(event: string | symbol, listener: (...args: any[]) => void): any;
            removeListener(event: string | symbol, listener: (...args: any[]) => void): any;
            off(event: string | symbol, listener: (...args: any[]) => void): any;
            removeAllListeners(event?: string | symbol): any;
            setMaxListeners(n: number): any;
            getMaxListeners(): number;
            listeners(event: string | symbol): Function[];
            rawListeners(event: string | symbol): Function[];
            emit(event: string | symbol, ...args: any[]): boolean;
            eventNames(): (string | symbol)[];
            listenerCount(type: string | symbol): number;
        };
        new (content?: {
            [column: string]: any;
        }): {
            readonly $methods: {
                [column: string]: Function;
            };
            readonly [Symbol.toStringTag]: string;
            readonly min: MinDB;
            readonly queue: Queue;
            key: string;
            runLifecycle(content?: {
                [column: string]: any;
            }): void;
            getCacheData(key?: string): any;
            readonly hashKey: string;
            validate(key: string, value: any): boolean;
            get(key: string): Promise<any>;
            set(key: string, value: any): Promise<any[]>;
            reset(key?: string): Promise<any[]>;
            remove(): Promise<void>;
            [cacheSymbol]: {
                [column: string]: any;
            };
            addListener(event: string | symbol, listener: (...args: any[]) => void): any;
            on(event: string | symbol, listener: (...args: any[]) => void): any;
            once(event: string | symbol, listener: (...args: any[]) => void): any;
            prependListener(event: string | symbol, listener: (...args: any[]) => void): any;
            prependOnceListener(event: string | symbol, listener: (...args: any[]) => void): any;
            removeListener(event: string | symbol, listener: (...args: any[]) => void): any;
            off(event: string | symbol, listener: (...args: any[]) => void): any;
            removeAllListeners(event?: string | symbol): any;
            setMaxListeners(n: number): any;
            getMaxListeners(): number;
            listeners(event: string | symbol): Function[];
            rawListeners(event: string | symbol): Function[];
            emit(event: string | symbol, ...args: any[]): boolean;
            eventNames(): (string | symbol)[];
            listenerCount(type: string | symbol): number;
        };
        readonly modelName: string;
        readonly prefix: string;
        readonly sequence: string;
        readonly validateData: {
            [column: string]: any;
        };
        readonly defaultData: {
            [column: string]: any;
        };
        min: MinDB;
        use(min: MinDB): void;
        readonly BaseIndexer: typeof BaseIndexer;
        setIndexer(type: string | StringConstructor | NumberConstructor | BooleanConstructor | ObjectConstructor | ArrayConstructor | DateConstructor | ErrorConstructor, indexerCtor: typeof BaseIndexer): void;
        setIndexerForColumn(key: string, indexerCtor: typeof BaseIndexer): void;
        extend(name: string, columns: {
            [column: string]: any;
        }): any;
        fetch(key: string): Promise<Model>;
        setIndex(column: string): Indexer;
        search(column: string, query: any): Searcher;
        [indexersSymbol]: Map<string, Indexer>;
        listenerCount(emitter: EventEmitter, event: string | symbol): number;
        defaultMaxListeners: number;
        EventEmitter: typeof EventEmitter;
    };
    static fetch(key: string): Promise<Model>;
    static setIndex(column: string): Indexer;
    static search(column: string, query: any): Searcher;
    key: string;
    [cacheSymbol]: {
        [column: string]: any;
    };
    constructor(key: string, content?: {
        [column: string]: any;
    });
    constructor(content?: {
        [column: string]: any;
    });
    runLifecycle(content?: {
        [column: string]: any;
    }): void;
    getCacheData(key?: string): any;
    readonly hashKey: string;
    readonly $methods: IMethods;
    readonly queue: Queue;
    readonly min: MinDB;
    validate(key: string, value: any): boolean;
    get(key: string): Promise<any>;
    set(key: string, value: any): Promise<any[]>;
    reset(key?: string): Promise<any[]>;
    remove(): Promise<void>;
}
export declare class Searcher extends EventEmitter {
    private chain;
    private modelCtor;
    constructor(column: string, query: any, modelCtor: typeof Model);
    search(column: string, query: any): void;
    private getData;
    private plainSearch;
    exec(): Promise<Model[]>;
}
export {};
