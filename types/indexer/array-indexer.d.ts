import BaseIndexer from './base-indexer';
export default class ArrayIndexer extends BaseIndexer {
    indexMapper(array: any[]): string[];
}
