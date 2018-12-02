import BaseIndexer from './base-indexer'

export default class BooleanIndexer extends BaseIndexer {

  // Overwrite ::indexMapper
  indexMapper(bool: boolean) {
    return [ bool ]
  }

}