import BaseIndexer from './base-indexer'

export default class StringIndexer extends BaseIndexer {

  indexMapper(str: string) {
    const set = new Set(
      str
        .split(/[\s,\.;\:"'!]/)
        .filter(Boolean)
        .map(s => s.toLowerCase())
    )

    return Array.from(set)
  }

}
