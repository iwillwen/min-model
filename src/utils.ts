export function camel2Hyphen(str: string) {
  return str.replace(/([A-Z])/g, '-$1').toLowerCase().replace(/^\-/, '')
}

export function hyphen2Camel(str: string) {
  str = str.replace(/\-(\w{1})/g, match => match[1].toUpperCase())
  return str.replace(/^(\w{1})/, m => m.toUpperCase())
}

const nativeTypes = new Map()

nativeTypes.set(String, 'string')
nativeTypes.set(Number, 'number')
nativeTypes.set(Boolean, 'boolean')
nativeTypes.set(Object, 'object')
nativeTypes.set(Array, 'array')
nativeTypes.set(Date, 'date')
nativeTypes.set(RegExp, 'regexp')
nativeTypes.set(Error, 'error')

export function checkNativeType(v: any) {
  return nativeTypes.has(v)
}

export function nameOfNativeType(v: any) {
  return nativeTypes.has(v) ? nativeTypes.get(v) : null
}

export function isFunction(v: any) {
  return typeof v === 'function'
}

export function isString(v: any) {
  return typeof v === 'string'
}

export function isNumber(v: any) {
  return typeof v === 'number'
}

export function isBoolean(v: any) {
  return typeof v === 'boolean'
}

export function detectNativeType(v: any) {
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

export function merge(target: any, ...objs: any[]) {
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

export function deepEqual(actual: any, expected: any, opts?: any) {
  if (!opts) opts = {};
  // 7.1. All identical values are equivalent, as determined by ===.
  if (actual === expected) {
    return true;

  } else if (actual instanceof Date && expected instanceof Date) {
    return actual.getTime() === expected.getTime();

  // 7.3. Other pairs that do not both pass typeof value == 'object',
  // equivalence is determined by ==.
  } else if (!actual || !expected || typeof actual != 'object' && typeof expected != 'object') {
    return opts.strict ? actual === expected : actual == expected;

  // 7.4. For all other Object pairs, including Array objects, equivalence is
  // determined by having the same number of owned properties (as verified
  // with Object.prototype.hasOwnProperty.call), the same set of keys
  // (although not necessarily the same order), equivalent values for every
  // corresponding key, and an identical 'prototype' property. Note: this
  // accounts for both named and indexed properties on Arrays.
  } else {
    return objEquiv(actual, expected, opts);
  }
}

export function isUndefinedOrNull(value: any) {
  return value === null || value === undefined;
}

export function isBuffer(x: any) {
  if (!x || typeof x !== 'object' || typeof x.length !== 'number') return false;
  if (typeof x.copy !== 'function' || typeof x.slice !== 'function') {
    return false;
  }
  if (x.length > 0 && typeof x[0] !== 'number') return false;
  return true;
}

export function objEquiv(a: any, b: any, opts: any) {
  var i, key;
  if (isUndefinedOrNull(a) || isUndefinedOrNull(b))
    return false;
  if (a.prototype !== b.prototype) return false;
  if (isBuffer(a)) {
    if (!isBuffer(b)) {
      return false;
    }
    if (a.length !== b.length) return false;
    for (i = 0; i < a.length; i++) {
      if (a[i] !== b[i]) return false;
    }
    return true;
  }
  try {
    var ka = Object.keys(a),
        kb = Object.keys(b);
  } catch (e) {//happens when one is a string literal and the other isn't
    return false;
  }
  // having the same number of owned properties (keys incorporates
  // hasOwnProperty)
  if (ka.length != kb.length)
    return false;
  //the same set of keys (although not necessarily the same order),
  ka.sort();
  kb.sort();
  //~~~cheap key test
  for (i = ka.length - 1; i >= 0; i--) {
    if (ka[i] != kb[i])
      return false;
  }
  //equivalent values for every corresponding key, and
  //~~~possibly expensive deep test
  for (i = ka.length - 1; i >= 0; i--) {
    key = ka[i];
    if (!deepEqual(a[key], b[key], opts)) return false;
  }
  return typeof a === typeof b;
}