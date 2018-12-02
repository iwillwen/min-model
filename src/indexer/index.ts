export { default as BaseIndexer } from './base-indexer'

import { EventEmitter } from 'events'
import BaseIndexer from './base-indexer'
import StringIndexer from './string-indexer'
import ArrayIndexer from './array-indexer'
import BooleanIndexer from './boolean-indexer'
import DateIndexer from './date-indexer'
import NumberIndexer from './number-indexer'
import ObjectIndexer from './object-indexer'

import { MinDB } from 'min'
import { nameOfNativeType } from '../utils'

export type Constructor = StringConstructor | NumberConstructor | BooleanConstructor | ObjectConstructor | ArrayConstructor | DateConstructor | ErrorConstructor

const typesMap = new Map<string | Constructor, typeof BaseIndexer>()

typesMap.set('string', StringIndexer)
typesMap.set(String, StringIndexer)
typesMap.set('array', ArrayIndexer)
typesMap.set(Array, ArrayIndexer)
typesMap.set('boolean', BooleanIndexer)
typesMap.set('date', DateIndexer)
typesMap.set(Date, DateIndexer)
typesMap.set('number', NumberIndexer)
typesMap.set(Number, NumberIndexer)
typesMap.set('object', ObjectIndexer)
typesMap.set(Object, ObjectIndexer)

const keysMap = new Map()

export default class Index extends EventEmitter {

  private ready: boolean = false
  private indexer: BaseIndexer

  constructor(sequence: string, prefix: string, key: string, type: string | Constructor, min: MinDB) {
    super()

    switch (true) {
      case keysMap.has(`${sequence}:${key}`):
        this.indexer = new (keysMap.get(`${sequence}:${key}`))(sequence, prefix, key, min)
        break

      case typesMap.has(type):
        this.indexer = new (typesMap.get(type))(sequence, prefix, key, min)
        break
      
      default:
        throw new Error('Not support for this type.')
    }

    this.indexer.map()
    this.indexer
      .on('ready', () => {
        this.ready = true
        this.emit('ready')
      })
      .on('updated', () => this.emit('updated'))
  }

  awaitForReady() {
    if (this.ready) {
      return Promise.resolve(true)
    }

    return new Promise<boolean>(resolve => {
      this.once('ready', () => resolve(true))
    })
  }

  async add(key: string, value: any) {
    if (!this.indexer) throw new ReferenceError('There not indexer available.')

    await this.awaitForReady()

    return await this.indexer.add(key, value)
  }

  async remove(key: string, value: any) {
    if (!this.indexer) throw new ReferenceError('There not indexer available.')

    await this.awaitForReady()

    return await this.indexer.remove(key, value)
  }

  async reindex(key: string, newValue: any, oldValue: any) {
    if (!this.indexer) throw new ReferenceError('There not indexer available.')

    await this.awaitForReady()

    return await this.indexer.reindex(key, newValue, oldValue)
  }

  async search(query: any, chainData?: any[]) {
    if (!this.indexer) throw new ReferenceError('There not indexer available.')

    await this.awaitForReady()

    return await this.indexer.search(query, chainData)
  }

}

export function setIndexer(type: string | Constructor, indexerCtor: typeof BaseIndexer) {
  typesMap.set(type, indexerCtor)
  typesMap.set(nameOfNativeType(type), indexerCtor)
}

export function setIndexerForColumn(key: string, indexerCtor: typeof BaseIndexer) {
  keysMap.set(key, indexerCtor)
}