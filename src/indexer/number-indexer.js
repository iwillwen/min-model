import BaseIndexer from './base-indexer'

export default class NumberIndexer extends BaseIndexer {

  // Overwrite ::indexMapper
  indexMapper(number) {
    return [
      number % 3,
      number % 5,
      number % 7
    ]
  }

  search(query, chainData) {
    return this._search(query, chainData)
      .then(result => Promise.resolve(
        result.filter(item => item[this.key] === query)
      ))
  }
}