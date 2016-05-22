import { EventEmitter } from 'events'

export default class BaseIndexer extends EventEmitter {
  constructor(sequence, prefix, key, min) {
    super()

    this.sequence = sequence
    this.prefix = prefix
    this.key = key
    this.__min = min
    this.ready = false

    this.map()
  }

  map() {
    this.__min.smembers(this.sequence)
      .then(keys => {
        const multi = this.__min.multi()

        keys.forEach(key => multi.hget(this.prefix + ':' + key, this.key))

        return multi.exec()
          .then(values => Promise.resolve(values.map((val, i) => [ keys[i], val ])))
      })
      .then(tuples => {
        const multi = this.__min.multi()

        for (const [ key, val ] of tuples) {
          const indexes = this.indexMapper(val)

          for (const index of indexes) {
            multi.sadd(this.sequence + ':' + this.key + ':index:' + index, key) 
          }
        }

        return multi.exec()
      })
      .then((...args) => {
        this.ready = true
        this.emit('ready')
      })
  }

  add(key, val) {
    const indexes = this.indexMapper(val)

    const multi = this.__min.multi()

    for (const index of indexes) {
      multi.sadd(this.sequence + ':' + this.key + ':index:' + index, key)
    }

    return multi.exec()
  }

  remove(key, val) {
    const indexes = this.indexMapper(val)

    const multi = this.__min.multi()

    for (const index of indexes) {
      multi.srem(this.sequence + ':' + this.key + ':index:' + index, key)
    }

    return multi.exec()
  }

  reindex(key, newValue, oldValue) {
    return this.remove(key, oldValue)
      .then(() => this.add(key, newValue))
      .then(() => {
        this.emit('updated')

        return Promise.resolve()
      })
  }

  _search(query, chainData = null) {
    const indexes = this.indexMapper(query)

    return Promise.all(indexes.map(index => {
      return this.__min.exists(this.sequence + ':' + this.key + ':index:' + index)
        .then(exists => {
          if (exists) {
            return this.__min.smembers(this.sequence + ':' + this.key + ':index:' + index)
          } else {
            return Promise.resolve([])
          }
        })
        .then(keys => Promise.resolve(new Set(keys)))
    }))
      .then(keys => {
        const intersect = intersection(...keys)

        return (new Promise(resolve => {
          if (chainData) {
            resolve(chainData.map(item => [ item._key, item ]))
          } else {
            this.__min.smembers(this.sequence)
              .then(_keys => {
                const multi = this.__min.multi()

                _keys.forEach(id => multi.hgetall(this.prefix + ':' + id))

                return multi.exec()
                  .then(values => Promise.resolve(values.map((val, i) => [ _keys[i], val ])))
              })
              .then(v => resolve(v))
          }
        }))
          .then(data => Promise.resolve([ data, intersect ]))
      })
      .then(([ data, intersect ]) => Promise.resolve(
        data
          .filter(([ key ]) => intersect.has(key))
          .map(([ key, item ]) => {
            item._key = key
            return item
          })
      ))
  }

  search(...args) {
    return this._search(...args)
  }

  indexMapper() {
    // Need to be overwrite
    return []
  }
}

function intersection(set, ...sets) {
  const ret = new Set()

  if (sets.length === 0) return set

  for (const elem of set) {
    if (sets.map(set => set.has(elem) ? 0 : 1).reduce((a, b) => a + b) == 0) {
      ret.add(elem)
    }
  }

  return ret
}