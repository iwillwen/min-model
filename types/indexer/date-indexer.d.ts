import BaseIndexer from './base-indexer';
export default class DateIndexer extends BaseIndexer {
    indexMapper(date: Date): number[];
    search(query: Date, chainData: any[]): Promise<any[]>;
}
