import BaseIndexer from './base-indexer'

export default class ArrayIndexer extends BaseIndexer {

  // Overwrite ::indexMapper
  indexMapper(array) {
    return array.map(el => JSON.stringify(el))
  }

}