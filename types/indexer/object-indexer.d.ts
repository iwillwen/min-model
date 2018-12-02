import BaseIndexer from './base-indexer';
export default class ObjectIndexer extends BaseIndexer {
    indexMapper(obj: any): string[];
}
