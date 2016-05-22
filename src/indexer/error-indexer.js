import BaseIndexer from './base-indexer'

export default class ErrorIndexer extends BaseIndexer {

  // Overwrite ::indexMapper
  indexMapper(error) {
    const set = new Set(
      error.message
        .split(/[\s,\.;\:"'!]/)
        .filter(Boolean)
        .map(s => s.toLowerCase())
    )

    return [...set]
  }

}