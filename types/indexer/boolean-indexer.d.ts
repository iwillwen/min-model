import BaseIndexer from './base-indexer';
export default class BooleanIndexer extends BaseIndexer {
    indexMapper(bool: boolean): boolean[];
}
