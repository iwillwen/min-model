import BaseIndexer from './base-indexer';
export default class StringIndexer extends BaseIndexer {
    indexMapper(str: string): string[];
}
