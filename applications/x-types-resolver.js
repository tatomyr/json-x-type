import {isRef} from '@redocly/openapi-core/lib/ref-utils.js'
import {isObject, mergeAll} from './x-types-utils.js'

const omit = (maybeObj, keys) => {
  if (isObject(maybeObj)) {
    const obj = {...maybeObj}
    for (const key of keys) {
      delete obj[key]
    }
    return obj
  } else if (Array.isArray(maybeObj)) {
    return maybeObj.map(item => omit(item, keys))
  }

  console.error(
    `Cannot omit keys (${keys.join(', ')}) from non-object: ${JSON.stringify(maybeObj)}.`
  )
  return maybeObj
}

export const resolveAndMerge = (xType, ctx, parents = []) => {
  const maxDepth = ctx._circularRefsMaxDepth ?? 3

  // Handle null types
  if (xType === null) {
    return null
  }

  // Handle $refs
  if (isRef(xType)) {
    if (parents.filter(p => p?.$ref === xType.$ref).length >= maxDepth) {
      console.warn('WARNING! Circular reference detected:', xType.$ref)
      // Returning `any` to avoid circular references:
      return 'any'
    }
    const resolved = ctx.resolve(xType, ctx._from)
    if (resolved.node === undefined) {
      console.error('ERROR! Cannot resolve $ref:')
      console.error(xType.$ref)
      return 'any'
    }
    ctx._from = resolved.location.source.absoluteRef // this is needed for resolving $refs outside the main document
    const result = resolveAndMerge(resolved.node, ctx, [...parents, xType])
    if (xType.$omit === undefined) {
      return result
    } else {
      return omit(result, xType.$omit)
    }
  }

  // Handle AND types
  if (xType.$and) {
    if (!Array.isArray(xType.$and)) {
      console.error('ERROR! Expected an array but got:')
      console.error(xType.$and)
      return 'undefined'
    }
    return mergeAll(
      ...xType.$and.map(item => resolveAndMerge(item, ctx, [...parents, xType]))
    )
  }

  // Handle OR types
  if (Array.isArray(xType)) {
    if (xType.length === 0) {
      return 'undefined'
    }
    if (xType.length === 1) {
      return resolveAndMerge(xType[0], ctx, [...parents, xType])
    }
    return xType
      .map(type => resolveAndMerge(type, ctx, [...parents, xType]))
      .flat()
  }

  // Handle object types
  if (isObject(xType)) {
    let obj = {}
    for (const key in xType) {
      obj[key] = resolveAndMerge(xType[key], ctx, [...parents, xType])
    }
    return obj
  }

  return xType
}
