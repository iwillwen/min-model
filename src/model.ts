import { EventEmitter } from 'events'
import { MinDB } from 'min'
import {
  camel2Hyphen,
  hyphen2Camel,
  checkNativeType,
  detectNativeType,
  merge,
  deepEqual,
  isFunction, isString, isNumber, isBoolean
} from './utils'
import { default as Indexer, BaseIndexer, setIndexer, setIndexerForColumn, Constructor } from './indexer'
import Queue from './queue'

const prefixSymbol = Symbol('prefix')
const sequenceSymbol = Symbol('sequence')
const cacheSymbol = Symbol('cache')
const indexersSymbol = Symbol('indexers')

export interface IMethods {
  beforeValidate?(content: { [column: string]: any }): any
  beforeStore?(): any
  ready?(): any
  beforeUpdate?(key: string, value: any, oldValue: any): any
  afterUpdate?(key: string, value: any, oldValue: any): any
  beforeRemove?(key: string): void
  afterRemove?(key: string): void
}

export default class Model extends EventEmitter {

  static min: MinDB
  static sequence: string
  static prefix: string
  static [indexersSymbol]: Map<string, Indexer>

  static use(min: MinDB) {
    this.min = min
  }

  static get BaseIndexer() {
    return BaseIndexer
  }

  static setIndexer(type: string | Constructor, indexerCtor: typeof BaseIndexer) {
    setIndexer(type, indexerCtor)
  }

  static setIndexerForColumn(key: string, indexerCtor: typeof BaseIndexer) {
    setIndexerForColumn(`${this.sequence}:${key}`, indexerCtor)
  }

  static extend(name: string, columns: { [column: string]: any }) {

    const privates = {
      [prefixSymbol]: camel2Hyphen(name),
      [sequenceSymbol]: camel2Hyphen(name) + 's'
    }

    const validateData: { [column: string]: any } = {}
    const defaultData: { [column: string]: any } = {}
    const methods: { [column: string]: Function } = {}

    for (const column of Object.keys(columns)) {
      const columnProperty = columns[column]

      if (isFunction(columnProperty) && !checkNativeType(columnProperty)) {
        methods[column] = columnProperty
        continue
      }

      if (checkNativeType(columnProperty)) {
        if (Array.isArray(columnProperty) && columnProperty.length === 1 && isFunction(columnProperty[0])) {
          // TODO: Add Array of Model support
        }

        validateData[column] = columnProperty
        defaultData[column] = columnProperty()
      } else {
        validateData[column] = detectNativeType(columnProperty)
        defaultData[column] = columnProperty
      }
    }

    const toStringTag = hyphen2Camel(name)
    console.log(name, toStringTag)

    const queue = new Queue()

    return class extends Model {

      static get modelName() {
         return toStringTag
      }

      static get prefix() {
        return privates[prefixSymbol]
      }

      static get sequence() {
        return privates[sequenceSymbol]
      }

      static get validateData() {
        return validateData
      }

      static get defaultData() {
        return defaultData
      }

      get $methods() {
        return methods
      }

      get [Symbol.toStringTag]() {
        return toStringTag
      }

      get min() {
        return Model.min
      }

      get queue() {
        return queue
      }
    }

  }

  static async fetch(key: string) {
    const exists = await this.min.sismember(this.sequence, key)
    if (!exists) {
      throw new Error('Object not found.')
    }

    const data = await this.min.hgetall(`${this.prefix}:${key}`)
    return new this(key, data)
  }

  static setIndex(column: string) {
    if (!this[indexersSymbol]) {
      this[indexersSymbol] = new Map<string, Indexer>()
    }

    const type = (this as any)['validateData'][column]
    const indexer = new Indexer(this.sequence, this.prefix, column, type, this.min)

    this[indexersSymbol].set(column, indexer)

    return indexer
  }

  static search(column: string, query: any) {
    return new Searcher(column, query, this)
  }

  public key: string
  [cacheSymbol]: { [column: string]: any } = {}

  constructor(key: string, content?: { [column: string]: any })
  constructor(content?: { [column: string]: any })

  constructor(keyOrContent: string | { [column: string]: any }, content?: { [column: string]: any }) {
    super()

    if (keyOrContent && content) {
      this.key = keyOrContent as string
      this[cacheSymbol] = content
    } else {
      if (!content) {
        content = keyOrContent as { [column: string]: any }
        this.key = Math.random().toString(32).substr(2)
      } else {
        this.key = keyOrContent as string || Math.random().toString(32).substr(2)
      }

      this[cacheSymbol] = merge({}, (this.constructor as any)['defaultData'])
  
    }

    this.runLifecycle(content)
  }

  runLifecycle(content?: { [column: string]: any }) {

    // Lifecyle: beforeValidate
    if (this.$methods.beforeValidate) {
      const rtn = this.$methods.beforeValidate.call(this, content)

      if (rtn) {
        content = rtn
      }
    }

    const columns = Object.keys(content)

    for (const key of columns) {
      if (!this.validate(key, content[key])) {
        throw new TypeError(`Type validate failed on column "${key}".`)
      }
    }

    this[cacheSymbol] = merge(this[cacheSymbol], content)

    for (const name of Object.keys(this.$methods)) {
      (this as any)[name] = (...args: any[]) => (this.$methods as any)[name].call(this, ...args)
    }

    this.queue.push(async () => {
      // Lifecyle: beforeStore
      if (this.$methods.beforeStore) {
        this.$methods.beforeStore.call(this)
      }

      await this.min.sadd((this.constructor as any)['sequence'], this.key)
      await this.min.hmset(this.hashKey, this[cacheSymbol])
      
      for (const key of Object.keys(this[cacheSymbol])) {
        if ((this.constructor as any)[indexersSymbol] && (this.constructor as any)[indexersSymbol].has(key)) {
          await ((this.constructor as any)[indexersSymbol] as Map<string, BaseIndexer>).get(key).add(this.key, this[cacheSymbol][key])
        }
      }
    })
      .then(() => {
        if (this.$methods.ready) {
          this.$methods.ready.call(this)
        }
    
        this.emit('ready')
      })

    this.queue.run()
  }

  getCacheData(key: string = null) {
    if (!key) {
      return this[cacheSymbol]
    } else {
      return this[cacheSymbol][key]
    }
  }

  get hashKey() {
    return (this.constructor as any)['prefix'] + ':' + this.key
  }

  get $methods(): IMethods {
    return {}
  }

  get queue(): Queue {
    return null
  }

  get min(): MinDB {
    return null
  }

  validate(key: string, value: any) {
    switch((this.constructor as any)['validateData'][key]) {
      case String:
        return isString(value)
        break

      case Number:
        return isNumber(value)
        break

      case Boolean:
        return isBoolean(value)
        break

      default:
        return value instanceof ((this.constructor as any)['validateData'][key] || Object)
    }
  }

  async get(key: string) {
    if (this[cacheSymbol][key]) {
      return this[cacheSymbol][key]
    }

    const value = await this.min.hget(this.hashKey, key)
    this[cacheSymbol][key] = value

    return value
  }

  async set(key: string, value: any) {
    if (!this.validate(key, value)) {
      throw new TypeError('Type validate failed.')
    }

    const oldValue = this[cacheSymbol][key]

    // Lifecyle: beforeUpdate
    if (this.$methods.beforeUpdate) {
      this.$methods.beforeUpdate.call(this, key, value, oldValue)
    }

    this[cacheSymbol][key] = value

    await this.min.hset(this.hashKey, key, value)

    if ((this.constructor as any)[indexersSymbol] && (this.constructor as any)[indexersSymbol].has(key)) {
      const indexer = ((this.constructor as any)[indexersSymbol] as Map<string, BaseIndexer>).get(key)

      await indexer.reindex(this.key, value, oldValue)
    }

    // Lifecyle: afterUpdate
    if (this.$methods.afterUpdate) {
      this.$methods.afterUpdate.call(this, key, value, oldValue)
    }

    return [ key, value ]
  }

  async reset(key?: string) {
    if (key) {
      return await this.set(key, (this.constructor as any)['defaultData'][key])
    }

    const columns = Object.keys((this.constructor as any)['defaultData'])

    for (const key of columns) {
      await this.set(key, (this.constructor as any)['defaultData'][key])
    }
  }

  async remove() {
    // Lifecyle: beforeRemove
    if (this.$methods.beforeRemove) {
      this.$methods.beforeRemove.call(this)
    }

    await this.min.srem((this.constructor as any)['sequence'], this.key)
    await this.min.del(this.hashKey)

    for (const key of Object.keys(this[cacheSymbol])) {
      if ((this.constructor as any)[indexersSymbol] && (this.constructor as any)[indexersSymbol].has(key)) {
        const indexer = ((this.constructor as any)[indexersSymbol] as Map<string, BaseIndexer>).get(key)
  
        await indexer.remove(this.key, this[cacheSymbol][key])
      }
    }

    this.key = null
    this[cacheSymbol] = null

    // Lifecyle: afterRemove
    if (this.$methods.afterRemove) {
      this.$methods.afterRemove.call(this)
    }
  }

}

export class Searcher extends EventEmitter {

  private chain: Array<[ string, any ]> = []
  private modelCtor: typeof Model

  constructor(column: string, query: any, modelCtor: typeof Model) {
    super()

    this.chain.push([ column, query ])
    this.modelCtor = modelCtor
  }

  search(column: string, query: any) {
    this.chain.push([ column, query ])
  }

  private async getData(keys: string[]) {
    return (await Promise.all(keys.map(key => this.modelCtor.min.hgetall(`${this.modelCtor.prefix}:${key}`))))
      .map((item: any, i: number) => {
        item._key = keys[i]
        return item
      })
  }

  private async plainSearch(column: string, query: any, chainData?: any[]) {
    if ((this.modelCtor as any)['validateData'][column] !== detectNativeType(query)) {
      return Promise.reject(new TypeError('Type wrong'))
    }

    if (!chainData) {
      const keys = await this.modelCtor.min.smembers(this.modelCtor.sequence)
      chainData = await this.getData(keys)
    }

    const values = await Promise.all(chainData.map(({ _key }) => this.modelCtor.min.hget(`${this.modelCtor.prefix}:${_key}`, column)))
    const tuples = values.map((value, i) => [ chainData[i]._key, value ])

    const keys = tuples
      .filter(([ key, value ]) => {
        if ((this.modelCtor as any)['validateData'][column] === String) {
          return value.indexOf(query) >= 0
        }

        return deepEqual(value, query)
      })
      .map(([ key ]) => key)

    return this.getData(keys)
  }

  async exec() {
    let lastRoundData: any[]

    for (const [ column, query ] of this.chain) {
      if (this.modelCtor[indexersSymbol].has(column)) {
        const indexer = this.modelCtor[indexersSymbol].get(column)
        lastRoundData = await indexer.search(query, lastRoundData)
      } else {
        lastRoundData = await this.plainSearch(column, query, lastRoundData)
      }
    }

    return lastRoundData.map(item => {
      const key = item._key
      delete item._key
      return new this.modelCtor(key, item)
    })
  }

}