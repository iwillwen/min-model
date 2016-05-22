import BaseIndexer from './base-indexer'

export default class BooleanIndexer extends BaseIndexer {

  // Overwrite ::indexMapper
  indexMapper(bool) {
    return [ bool ]
  }

}