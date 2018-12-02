import { EventEmitter } from 'events'

interface ITaskFunc {
  (...args: any[]): Promise<any>
}

export default class Queue extends EventEmitter {

  private queue: Array<{
    task: ITaskFunc,
    id: string
  }> = []
  private running = false

  constructor() {
    super()
  }

  push(task: ITaskFunc) {
    const id = Math.random().toString(32).substr(2)

    this.queue.push({
      task, id
    })

    return new Promise((resolve, reject) => {
      this.once(`task:${id}:resolve`, resolve)
      this.once(`task:${id}:reject`, reject)
    })
  }

  run(running?: boolean) {
    if (!running) if (this.running) return this

    const curr = this.queue.shift()

    if (curr) {
      const { task, id } = curr
      this.running = true

      task()
        .then(result => {
          this.emit(`task:${id}:resolve`, result)
          this.run(this.running)
        })
        .catch(err => {
          this.emit(`task:${id}:reject`, err)
          this.run(this.running)
        })
    } else {
      this.running = false
      this.emit('idle')
    }

    return this
  }

  get hasNext() {
    return this.queue.length !== 0
  }
}