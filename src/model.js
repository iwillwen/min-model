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
import { isEqual, isString, isNumber, isBoolean, isFunction, isArray } from 'lodash'
import { EventEmitter } from 'events'

import { BaseIndexer, setIndexer, setIndexerForColumn } from './indexer'

const prefixSymbol = Symbol('prefix')
const sequenceSymbol = Symbol('sequence')
const cacheSymbol = Symbol('cache')
const indexersSymbol = Symbol('indexers')

class Model extends EventEmitter {

  // Set the using MinDB instance
  static use(min) {
    this.__min = min
  }

  static get BaseIndexer() { return BaseIndexer }

  static setIndexer(type, indexerCtor) { setIndexer(type, indexerCtor) }

  static setIndexerForColumn(key, indexerCtor) { setIndexerForColumn(`${this.sequence}:${key}`, indexerCtor) }

  // Create a new Model class
  static extend(name, columns) {

    if (name && !columns) {
      throw new Error('Model.extend() should receive 2 arguments, but received 1.')
    }

    if (!isString(name) && !columns) {
      throw new Error('Model.extend() first argument must be a string.')
    }

    const privates = {
      [prefixSymbol]: camel2Hyphen(name),
      [sequenceSymbol]: camel2Hyphen(name) + 's'
    }

    const validateData = {}
    const defaultData = {}
    const methods = {}

    for (const column of Object.keys(columns)) {
      if (isFunction(columns[column]) && !checkNativeType(columns[column])) {
        methods[column] = columns[column]
        continue
      }

      if (checkNativeType(columns[column])) {
        if (isArray(columns[column]) && columns[column].length === 1 && isFunction(columns[column][0])) {
          // TODO: Add Array of Model support
        }

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
      static get modelName() { return toStringTag }

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

      static get $methods() {
        return methods
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
    }

    for (const name of Object.keys(this.constructor.$methods)) {
      this[name] = (...args) => this.constructor.$methods[name].call(this, ...args)
    }

    this.__queue.push(() => {
      // Lifecyle: beforeStore
      if (this.$methods.beforeStore) {
        this.$methods.beforeStore.call(this)
      }

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
    }, () => {

      // Lifecyle: ready
      if (this.$methods.ready) {
        this.$methods.ready.call(this)
      }

      this.emit('ready', this)
    })
    this.__queue.run()
  }

  getCacheData(key = null) {
    if (!key) {
      return this[cacheSymbol]
    } else {
      return this[cacheSymbol][key]
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

    // Lifecyle: beforeUpdate
    if (this.$methods.beforeUpdate) {
      this.$methods.beforeUpdate.call(this, key, value, oldValue)
    }

    this[cacheSymbol][key] = value

    return this.__min.hset(this.hashKey, key, value)
      .then(() => {
        if (this.constructor[indexersSymbol] && this.constructor[indexersSymbol].has(key)) {
          const indexer = this.constructor[indexersSymbol].get(key)

          return indexer.reindex(this.key, value, oldValue)
        } else {
          return Promise.resolve()
        }
      })
      .then(() => {
        // Lifecyle: afterUpdate
        if (this.$methods.afterUpdate) {
          this.$methods.afterUpdate.call(this, key, value, oldValue)
        }

        Promise.resolve([ key, value ])
      })
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
    // Lifecyle: beforeRemove
    if (this.$methods.beforeRemove) {
      this.$methods.beforeRemove.call(this)
    }

    return this.__min.srem(this.constructor.sequence, this.key)
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

        // Lifecyle: afterRemove
        if (this.$methods.afterRemove) {
          this.$methods.afterRemove.call(this)
        }

        return Promise.resolve()
      })
  }

  get hashKey() {
    return this.constructor.prefix + ':' + this.key
  }

  get $methods() {
    return this.constructor.$methods
  }

  validate(key, value) {
    switch(this.constructor.validateData[key]) {
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
        return value instanceof (this.constructor.validateData[key] || Object)
    }
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
        .then(results => results.map(content => new this(content._key, content)))
    } else {
      return this.__plainSearch(column, query, chainData)
        .then(results => results.map(content => new this(content._key, content)))
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
            .then(keys => {
              const multi = this.__min.multi()

              keys.forEach(itemKey => multi.hget(this.prefix + ':' + itemKey, column))

              return multi.exec()
                .then(values => Promise.resolve(values.map((val, i) => [ keys[i], val ])))
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

  static dump() {
    return this.__min.exists(this.sequence)
      .then(exists => {
        if (exists) {
          return this.__min.smembers(this.sequence)
        } else {
          return Promise.resolve([])
        }
      })
      .then(keys => {
        const multi = this.__min.multi()

        keys.forEach(itemKey => multi.hgetall(this.prefix + ':' + itemKey))

        return multi.exec()
          .then(items => Promise.resolve(
            items.map((item, i) => {
              item._key = keys[i]
              return item
            })
          ))
      })
  }

  static allInstances() {
    return this.dump()
      .then(result => Promise.resolve(result.map(item => new this(item._key, item))))
  }
}

export default Model