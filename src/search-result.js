import { EventEmitter } from 'events'

export function SearchResult(value, context) {
  const promise = Promise.resolve(value)

  promise.search = function(key, query) {
    return context.search(key, query, value, context)
  }

  return promise
}

export function PendingSearchResult(promise, context) {
  const _promise = createPromise()
  const emitter = new EventEmitter()

  _promise.search = function(key, query) {
    return PendingSearchResult(new Promise((resolve, reject) => {
      emitter.once('ready', value => {
        context.search(key, query, value, context)
          .then(resolve)
          .catch(reject)
      })
    }), context)
  }

  promise.then(value => {
    _promise.resolve(value)
    emitter.emit('ready', value)
  })

  return _promise
}

function createPromise() {
  let resolve = null
  let reject = null

  const promise = new Promise((_1, _2) => {
    resolve = _1
    reject = _2
  })
  promise.resolve = (...args) => {
    resolve.apply(promise, args)
  }
  promise.reject = (...args) => {
    reject.apply(promise, args)
  }

  return promise
}