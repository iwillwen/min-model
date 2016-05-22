import BaseIndexer from './base-indexer'

export default class DateIndexer extends BaseIndexer {

  // Overwrite ::indexMapper
  indexMapper(date) {
    return [
      date.getUTCFullYear(),
      date.getUTCMonth(),
      date.getUTCDate(),
      date.getUTCDay()
    ]
  }

  search(query, chainData) {
    return this._search(query, chainData)
      .then(result => Promise.resolve(
        query.filter(date => date.getTime() === query.getTime())
      ))
  }
}