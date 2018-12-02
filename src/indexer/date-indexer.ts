import BaseIndexer from './base-indexer'

export default class DateIndexer extends BaseIndexer {

  // Overwrite ::indexMapper
  indexMapper(date: Date) {
    return [
      date.getUTCFullYear(),
      date.getUTCMonth(),
      date.getUTCDate(),
      date.getUTCDay()
    ]
  }

  async search(query: Date, chainData: any[]) {
    const results: any[] = await this.search(query, chainData)

    return results.filter(item => item[this.key].getTime() === query.getTime())
  }
}