const data = {}

const Queue = {
  _queue: [],

  running: false,

  run(running) {
    if (!running) {
      if (this.running) return
    }

    const curr = this._queue.shift()

    if (curr) {
      this.running = true
      const { task, callback } = curr
      task()
        .then((...args) => {
          callback(null, ...args)
          this.run(true)
        })
        .catch(err => {
          callback(err)
          this.run(true)
        })
    } else {
      this.running = false
    }
  },

  push(task, callback) {
    this._queue.push({
      task,
      callback
    })

    return this
  }
}


exports.memStore = class memStore {
  constructor() {
    this.async = true
    this.ready = true
  }

  get data() {
    return data
  }

  get(key, callback) {
    Queue
      .push(() => Promise.resolve(data[key]), callback)
      .run()
  }

  set(key, value, callback) {
    Queue
      .push(() => Promise.resolve(key, data[key] = value), callback)
      .run()
  }

  remove(key, callback) {
    Queue
      .push(() => {
        delete data[key]
        return true
      }, callback)
      .run()
  }
}