import BaseIndexer from './base-indexer'

export default class ObjectIndexer extends BaseIndexer {

  // Overwrite ::indexMapper
  indexMapper(obj) {
    return Object.keys(obj)
      .map(key => [ key, JSON.stringify(obj[key]) ])
      .reduce((a, b) => a.concat(b))
  }

}