import BaseIndexer from './base-indexer'

export default class StringIndexer extends BaseIndexer {

  // Overwrite ::indexMapper
  indexMapper(str) {
    const set = new Set(
      str
        .split(/[\s,\.;\:"'!]/)
        .filter(Boolean)
        .map(s => s.toLowerCase())
    )

    return [...set]
  }

}