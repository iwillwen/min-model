import { EventEmitter } from 'events'
import { MinDB } from 'min'

export default class BaseIndexer extends EventEmitter {

  private sequence: string
  private prefix: string
  key: string

  private min: MinDB
  private ready: boolean = false

  constructor(sequence: string, prefix: string, key: string, min: MinDB) {
    super()

    this.sequence = sequence
    this.prefix = prefix
    this.key = key
    this.min = min
  }

  public async map() {
    const exists = await this.min.exists(this.sequence)
    const keys = exists ? await this.min.smembers(this.sequence) : []

    let multi = this.min.multi()
    
    for (const key of keys) {
      multi.hget(`${this.prefix}:${key}`, this.key)
    }

    const values = await multi.exec()
    const tuples = values.map((val, i) => [ keys[i], val ])

    multi = this.min.multi()
    for (const [ key, val ] of tuples) {

      const rtn = this.indexMapper(val)
      const indexes = await Promise.resolve(rtn)
      for (const index of indexes) {
        multi.sadd(`${this.sequence}:${this.key}:index:${index}`, key)
      }
    }
      
    await multi.exec()

    this.ready = true
    this.emit('ready')
  }

  public async add(key: string, val: any) {
    const indexes = await Promise.resolve(this.indexMapper(val))
    const multi = this.min.multi()

    for (const index of indexes) {
      multi.sadd(`${this.sequence}:${this.key}:index:${index}`, key)
    }

    await multi.exec()
  }

  public async remove(key: string, val: any) {
    const indexes = await Promise.resolve(this.indexMapper(val))
    const multi = this.min.multi()

    for (const index of indexes) {
      multi.srem(`${this.sequence}:${this.key}:index:${index}`, key)
    }

    await multi.exec()
  }

  public async reindex(key: string, newValue: any, oldValue: any) {
    await this.remove(key, oldValue)
    await this.add(key, newValue)
    this.emit('updated')
  }

  private async _search(query: any, chainData?: any[]) {
    const indexes = await Promise.resolve(this.indexMapper(query))

    const keysRows: Set<string>[] = []

    for (const index of indexes) {
      const exists = await this.min.exists(`${this.sequence}:${this.key}:index:${index}`)
      const keys = new Set<string>(exists ? await this.min.smembers(`${this.sequence}:${this.key}:index:${index}`) : [])
      keysRows.push(keys)
    }

    const intersect = intersection(keysRows[0], ...keysRows.slice(1))

    let data: Array<[ string, any ]> = null

    if (chainData) {
      data = chainData.map(item => [ item._key, item ] as [ string, any ])
    } else {
      const keys = await this.min.smembers(this.sequence)
      const multi = this.min.multi()

      for (const id of keys) {
        multi.hgetall(`${this.prefix}:${id}`)
      }

      data = (await multi.exec()).map((val, i) => [ keys[i], val ] as [ string, any ])
    }

    return data
      .filter(([ key ]) => intersect.has(key))
      .map(([ key, item ]) => {
        item._key = key
        return item
      })
  }

  public async search(query: any, chainData?: any[]) {
    return await this._search(query, chainData)
  }

  // Need to be overwrite
  indexMapper(value: any): any[] {
    return []
  }
}

function intersection(set: Set<any>, ...sets: Array<Set<any>>) {
  const ret = new Set()

  if (sets.length === 0) return set

  for (const elem of set) {
    if (sets.map(set => (set.has(elem) ? 0 : 1) as number).reduce((a, b) => a + b) == 0) {
      ret.add(elem)
    }
  }

  return ret
}