/// <reference types="node" />
import { EventEmitter } from 'events';
interface ITaskFunc {
    (...args: any[]): Promise<any>;
}
export default class Queue extends EventEmitter {
    private queue;
    private running;
    constructor();
    push(task: ITaskFunc): Promise<{}>;
    run(running?: boolean): this;
    readonly hasNext: boolean;
}
export {};
