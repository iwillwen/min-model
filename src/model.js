import {
  camel2Hyphen,
  hyphen2Camel,
  checkNativeType,
  detectNativeType,
  merge
} from './utils'
import Queue from './queue'
import Indexer from './indexer'
import { PendingSearchResult } from './search-result'
import isEqual from 'lodash/isEqual'
import { EventEmitter } from 'events'

import { BaseIndexer, setIndexer } from './indexer'

const prefixSymbol = Symbol('prefix')
const sequenceSymbol = Symbol('sequence')
const cacheSymbol = Symbol('cache')
const indexersSymbol = Symbol('indexers')

class Model extends EventEmitter {

  // Set the using MinDB instance
  static use(min) {
    this.__min = min
  }

  static BaseIndexer() { return BaseIndexer }

  static setIndexer(column, indexerCtor) { setIndexer(column, indexerCtor) }

  // Create a new Model class
  static extend(name, columns) {
    const privates = {
      [prefixSymbol]: camel2Hyphen(name),
      [sequenceSymbol]: camel2Hyphen(name) + 's'
    }

    const validateData = {}
    const defaultData = {}

    for (const column of Object.keys(columns)) {
      if (checkNativeType(columns[column])) {
        validateData[column] = columns[column]
        defaultData[column] = columns[column]()
      } else {
        validateData[column] = detectNativeType(columns[column])
        defaultData[column] = columns[column]
      }
    }

    const toStringTag = hyphen2Camel(name)

    const queue = new Queue()

    class _Model extends Model {
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

      get [Symbol.toStringTag]() {
        return toStringTag
      }

      get __min() {
        return this.constructor.__min
      }

      get __queue() {
        return queue
      }
    }

    return _Model
  }

  constructor(key = null, content) {
    super()

    if (key && content) {
      this.key = key
      this[cacheSymbol] = content
    } else {
      if (!content) {
        content = key
        this.key = Math.random().toString(32).substr(2)
      } else {
        this.key = key || Math.random().toString(32).substr(2)
      }

      this[cacheSymbol] = merge({}, this.constructor.defaultData)
      this[cacheSymbol] = merge(this[cacheSymbol], content)

      this.__queue.push(() => {
        return this.__min.sadd(this.constructor.sequence, this.key)
          .then(() => this.__min.hmset(this.hashKey, this[cacheSymbol]))
          .then(() => Promise.all(
            Object.keys(this[cacheSymbol]).map(key => {
              if (this.constructor[indexersSymbol] && this.constructor[indexersSymbol].has(key)) {
                return this.constructor[indexersSymbol].get(key).add(this.key, this[cacheSymbol][key])
              } else {
                return Promise.resolve()
              }
            })
          ))
      }, () => this.emit('ready'))
      this.__queue.run()
    }
  }

  get(key) {
    if (this[cacheSymbol][key]) {
      return Promise.resolve(this[cacheSymbol][key])
    } else {
      return this.__min.hget(this.hashKey, 'key')
        .then(value => {
          this[cacheSymbol][key] = value
          return Promise.resolve(value)
        })
    }
  }

  set(key, value) {
    if (!this.validate(key, value)) {
      throw new TypeError('Type validate failed.')
    }

    const oldValue = this[cacheSymbol][key]

    this[cacheSymbol][key] = value

    return this.__min.hset(this.hashKey, key, value)
      .then(() => {
        if (this.constructor[indexersSymbol] && this.constructor[indexersSymbol].has(key)) {
          const indexer = this.constructor[indexersSymbol].get(key)

          return indexer.reindex(key, value, oldValue)
        } else {
          return Promise.resolve()
        }
      })
      .then(() => Promise.resolve([ key, value ]))
  }

  reset(key = null) {
    if (key) {
      return this.set(key, this.constructor.defaultData[key])
    }

    const columns = Object.keys(this.constructor.defaultData[key])

    return Promise.all(
      columns.map(key => this.set(key, this.constructor.defaultData[key]))
    )
  }

  remove() {
    this.__min.srem(this.constructor.sequence, this.key)
      .then(() => this.__min.del(this.hashKey))
      .then(() => Promise.all(
        Object.keys(this[cacheSymbol]).map(key => {
          if (this.constructor[indexersSymbol] && this.constructor[indexersSymbol].has(key)) {
            return this.constructor[indexersSymbol].get(key).remove(this.key, this[cacheSymbol][key])
          } else {
            return Promise.resolve()
          }
        })
      ))
      .then(() => {
        this.key = null
        this[cacheSymbol] = null

        return Promise.resolve()
      })
  }

  get hashKey() {
    return this.constructor.prefix + ':' + this.key
  }

  validate(key, value) {
    return value instanceof (this.constructor.validateData[key] || Object)
  }

  static fetch(key) {
    return this.__min.sismember(this.sequence, key)
      .then(res => {
        if (res) {
          return this.__min.hgetall(this.prefix + ':' + key)
        } else {
          return Promise.reject(new Error('Object not found.'))
        }
      })
      .then(content => Promise.resolve(new this(key, content)))
  }

  static setIndex(column) {
    if (!this[indexersSymbol]) {
      this[indexersSymbol] = new Map()
    }

    const type = this.validateData[column]
    const indexer = new Indexer(this.sequence, this.prefix, column, type, this.__min)

    this[indexersSymbol].set(column, indexer)

    return indexer
  }

  static search(column, query, chainData = null) {
    if (this[indexersSymbol] && this[indexersSymbol].has(column)) {
      const indexer = this[indexersSymbol].get(column)

      return indexer.search(query, chainData, this)
    } else {
      return this.__plainSearch(column, query, chainData)
    }
  }

  static __plainSearch(column, query, chainData = null) {
    if (this.validateData[column] !== detectNativeType(query))
      return Promise.reject(new TypeError('Type wrong'))

    // Whole searching
    return PendingSearchResult(
      (new Promise((resolve, reject) => {
        if (chainData) {
          resolve(chainData.map(item => [ item._key, item[column] ]))
        } else {
          this.__min.smembers(this.sequence)
            .then(ids => {
              const multi = this.__min.multi()

              ids.forEach(itemKey => multi.hget(this.prefix + ':' + itemKey, column))

              return multi.exec()
                .then(values => Promise.resolve(values.map((val, i) => [ ids[i], val ])))
            })
            .then(resolve)
            .catch(reject)
        }
      }))
        .then(tuples => Promise.resolve(
          tuples
            .filter(([ _key, value ]) => {
              if (this.validateData[column] === String)
                return value.includes(query)

              return isEqual(value, query)
            })
            .map(([ key, value ]) => key)
        ))
        .then(keys => {
          const multi = this.__min.multi()

          keys.forEach(key => multi.hgetall(this.prefix + ':' + key))

          return multi.exec()
            .then(result => Promise.resolve(result.map((item, i) => {
              item._key = keys[i]
              return item
            })))
        }),
      this
    )
  }
}

export default Model