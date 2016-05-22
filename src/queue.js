import { EventEmitter } from 'events'

export default class Queue extends EventEmitter {
  constructor() {
    super()

    this.__queue = []
    this.running = false
  }

  push(task, callback) {
    this.__queue.push({ task, callback })

    return this
  }

  run(running) {
    if (!running) if (this.running) return

    const curr = this.__queue.shift()

    if (curr) {
      this.running = true
      const { task, callback } = curr

      task()
        .then((...args) => {
          callback(null, ...args)
          this.run(this.running)
        })
        .catch(err => {
          callback(err)
          this.run(this.running)
        })
    } else {
      this.running = false
      this.emit('idle')
    }

    return this
  }

  get hasNext() {
    return this.__queue.length !== 0
  }
}