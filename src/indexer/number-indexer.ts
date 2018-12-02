import BaseIndexer from './base-indexer'

export default class NumberIndexer extends BaseIndexer {

  // Overwrite ::indexMapper
  indexMapper(number: number) {
    return [
      number % 3,
      number % 5,
      number % 7
    ]
  }

  async search(query: number, chainData: any[]) {
    const results: any[] = await this.search(query, chainData)
    return results.filter(item => item[this.key] === query)
  }
}