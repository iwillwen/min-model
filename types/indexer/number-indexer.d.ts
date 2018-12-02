import BaseIndexer from './base-indexer';
export default class NumberIndexer extends BaseIndexer {
    indexMapper(number: number): number[];
    search(query: number, chainData: any[]): Promise<any[]>;
}
