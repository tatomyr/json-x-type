export const RESERVED_KEYWORDS = [
  'string',
  'number',
  'boolean',
  'any',
  'undefined',
]

export const isObject = obj =>
  obj && typeof obj === 'object' && !Array.isArray(obj)

export const isEmptyObject = obj =>
  isObject(obj) && Object.keys(obj).length === 0

const product = (a, b) => {
  const result = []

  for (const itemA of a) {
    for (const itemB of b) {
      result.push([itemA, itemB])
    }
  }

  return result
}

const isPrimitive = value => {
  return (
    typeof value === 'string' ||
    typeof value === 'number' ||
    typeof value === 'boolean' ||
    value === null ||
    value === undefined ||
    value === 'undefined'
  )
}

const deepMergeTwo = (first, second) => {
  if (first === 'any') {
    return second
  }
  if (second === 'any') {
    return first
  }

  if (first === second) {
    return first
  }

  if (first === 'undefined' || second === 'undefined') {
    return 'undefined'
  }

  if (Array.isArray(first) && (isObject(second) || isPrimitive(second))) {
    return first.map(item => deepMergeTwo(item, second))
  }
  if (Array.isArray(second) && (isObject(first) || isPrimitive(first))) {
    return second.map(item => deepMergeTwo(first, item))
  }

  if (isPrimitive(first) || isPrimitive(second)) {
    // Handle strings
    if (
      first === 'string' &&
      typeof second === 'string' &&
      !RESERVED_KEYWORDS.includes(second)
    ) {
      return second
    }
    if (
      second === 'string' &&
      typeof first === 'string' &&
      !RESERVED_KEYWORDS.includes(first)
    ) {
      return first
    }

    console.error(
      `ERROR! Merging primitives is not allowed: '${first}' & '${second}'.`
    )
    return 'undefined'
  }

  if (
    typeof first.$array !== 'undefined' ||
    typeof second.$array !== 'undefined'
  ) {
    console.error('ERROR! Cannot merge array types.')
    return 'undefined'
  }

  if (typeof first.$and !== 'undefined') {
    return mergeAll(...first.$and, second)
  }
  if (typeof second.$and !== 'undefined') {
    return mergeAll(...second.$and, first)
  }

  // TODO: investigate if it's still needed
  if (Array.isArray(first) && Array.isArray(second)) {
    return product(first, second).map(([a, b]) => deepMergeTwo(a, b))
  }

  if (isObject(first) && isObject(second)) {
    const result = structuredClone(first)

    for (const key in second) {
      if (typeof result[key] === 'undefined') {
        result[key] = second[key]
      } else {
        result[key] = deepMergeTwo(result[key], second[key])
      }
    }

    return result
  }

  throw new Error(`Cannot merge ${first} & ${second}.`)
}

export const mergeAll = (...args) => {
  if (args.length === 0) {
    console.error('ERROR! Cannot merge empty lists.')
    return 'undefined'
  }
  return args.reduce((acc, item) => {
    return deepMergeTwo(acc, item)
  })
}

export const cleanupSchema = schema =>
  schema === undefined ? undefined : JSON.parse(JSON.stringify(schema))
