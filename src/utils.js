export function camel2Hyphen(str) {
  return str.replace(/([A-Z])/g, '-$1').toLowerCase().replace(/^\-/, '')
}

export function hyphen2Camel(str) {
  str = str.replace(/\-(\w{1})/g, match => match[1].toUpperCase())
  return str.replace(/^(\w{1})/, m => m.toUpperCase())
}

const nativeTypes = new Map([
  [ String, 'string' ],
  [ Number, 'number' ],
  [ Boolean, 'boolean' ],
  [ Object, 'object' ],
  [ Array, 'array' ],
  [ Date, 'date' ],
  [ RegExp, 'regexp' ],
  [ Error, 'error' ]
])

export function checkNativeType(v) {
  return nativeTypes.has(v)
}

export function nameOfNativeType(v) {
  return nativeTypes.has(v) ? nativeTypes.get(v) : null
}

export function detectNativeType(v) {
  // Fallbacks
  if (Array.isArray(v)) return Array
  if (v instanceof Date) return Date
  if (v instanceof RegExp) return RegExp
  if (v instanceof Error) return Error
  if (v instanceof (Map || Object)) return (Map || Object)
  if (v instanceof (WeakMap || Object)) return (WeakMap || Object)
  if (v instanceof (Set || Object)) return (Set || Object)
  if (v instanceof (WeakSet || Object)) return (WeakSet || Object)

  for (const tuple of nativeTypes.entries()) {
    if (tuple[1] === typeof v) return tuple[0]
  }

  return Object
}

export function merge(target, ...objs) {
  for (const obj of objs) {
    const keys = Object.keys(obj)
    for (const key of keys) {
      if (obj.hasOwnProperty(key)) {
        target[key] = obj[key]
      }
    }
  }

  return target
}