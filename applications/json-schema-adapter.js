// Experimental feature

import {isRef} from '@redocly/openapi-core'
import {isPlainObject, isEmptyObject} from '@redocly/openapi-core/lib/utils.js'

export function translateJSONSchemaToXType(schema, ctx) {
  if (schema.type === 'null') {
    return null
  }

  if (
    schema.type === 'string' ||
    schema.type === 'number' ||
    schema.type === 'integer' ||
    schema.type === 'boolean'
  ) {
    if (schema.enum) {
      if (schema.enum.length === 1) {
        return schema.enum[0]
      }
      return schema.enum
    }

    let t = schema.type
    if (schema.type === 'integer') {
      t = 'number::integer'
    }
    if (
      schema.format &&
      schema.type !== 'number' &&
      schema.type !== 'integer'
    ) {
      t += `::${schema.format}`
    }
    if (schema.pattern) {
      t += `::pattern(${schema.pattern})`
    }
    if (schema.minimum || schema.minLength) {
      t += `::min(${schema.minimum || schema.minLength})`
    }
    if (schema.maximum || schema.maxLength) {
      t += `::max(${schema.maximum || schema.maxLength})`
    }

    return t
  }

  if (schema.type === 'object' && !schema.properties && !schema.oneOf) {
    if (
      schema.additionalProperties === undefined ||
      schema.additionalProperties === true
    ) {
      return {$record: 'any'}
    } else if (schema.additionalProperties === false) {
      return {$record: 'undefined'}
    }
  }

  if (isRef(schema)) {
    if (schema.$ref.startsWith('#/components/schemas/')) {
      // 🐒 This is a dirty quick implementation of transforming readOnly/writeOnly -> $omit alongside $ref
      const resolvedNode = ctx.resolve(schema)?.node

      const elevateProp = prop => {
        if (isRef(prop)) {
          return elevateProp(ctx.resolve(prop)?.node)
        }

        if (prop?.allOf) {
          let result = {}
          for (const innerProp of prop?.allOf || []) {
            result = {...result, ...elevateProp(innerProp)}
          }
          return result
        }

        return prop
      }

      let $omit
      if (isPlainObject(resolvedNode?.properties)) {
        $omit = Object.entries(resolvedNode.properties)
          .filter(([key, value]) => {
            const propNode = elevateProp(value)
            return (
              (propNode?.readOnly === true && ctx._mode === 'request') ||
              (propNode?.writeOnly === true && ctx._mode === 'response')
            )
          })
          .map(([key]) => key)
        if ($omit.length === 0) {
          $omit = undefined
        }
      }
      // End of 🐒

      return {
        $ref: schema.$ref.replace(
          '#/components/schemas/',
          '#/components/x-types/'
        ),
        $omit,
      }
    } else if (schema.$ref.startsWith('#/components/x-types/')) {
      console.log('Already a x-type $ref:', schema.$ref)
      return schema
    }

    const resolved = ctx.resolve(schema).node
    if (resolved === undefined) {
      console.error('ERROR! Cannot resolve $ref:')
      console.error(schema.$ref)
      return schema
    }
    return translateJSONSchemaToXType(resolved, ctx)
  }

  if (
    isPlainObject(schema.properties) ||
    isPlainObject(schema.additionalProperties) ||
    isPlainObject(schema.items)
  ) {
    return extractObjectLikeNode(schema, ctx)
  }

  if (schema.allOf) {
    const $and = schema.allOf.map(option =>
      translateJSONSchemaToXType(option, ctx)
    )
    if ($and.length === 1) {
      return $and[0] // handle singe AND
    }
    return {$and}
  }

  if (schema.oneOf) {
    const oneOfs = schema.oneOf.map(option =>
      translateJSONSchemaToXType(option, ctx)
    )
    if (oneOfs.length === 1) return oneOfs[0] // handle single OR
    return oneOfs
  }

  if (schema.anyOf) {
    const anyOfs = schema.anyOf.map(option =>
      translateJSONSchemaToXType(option, ctx)
    )
    if (anyOfs.length === 1) return anyOfs[0] // handle single OR
    return anyOfs
  }

  if (typeof schema === 'function') {
    return undefined
  }

  if (isPlainObject(schema)) {
    console.warn('WARNING! Unable to determine the exact type:', schema)
    return 'any'
  }

  throw new Error(`Cannot translate schema: ${JSON.stringify(schema)}`)
}

function extractObjectLikeNode(schema, ctx) {
  const properties = {}
  const $descriptions = {}
  for (const [name, property] of Object.entries(schema.properties || {})) {
    let realName = name
    if (name.startsWith('$') || !isNaN(name)) {
      realName = '$literal:' + name
    }
    if (Array.isArray(schema.required) && !schema.required.includes(name)) {
      // Handle known non-required properties
      properties[realName] = [
        translateJSONSchemaToXType(property, ctx),
        'undefined',
      ]
    } else {
      properties[realName] = translateJSONSchemaToXType(property, ctx)
    }
    if (property.description) {
      $descriptions[realName] = property.description
    }
  }

  if (isPlainObject(schema.additionalProperties)) {
    properties['$record'] = translateJSONSchemaToXType(
      schema.additionalProperties,
      ctx
    )
  }

  let items
  if (isPlainObject(schema.items)) {
    items = translateJSONSchemaToXType(schema.items, ctx)
  }

  // Add the discriminator as it is
  if (isPlainObject(schema.discriminator)) {
    properties['$discriminator'] = schema.discriminator
  }

  if (!isEmptyObject($descriptions)) {
    properties.$descriptions = $descriptions
  }
  if (!isEmptyObject(properties)) {
    return properties
  }
  if (items) {
    return {$array: items}
  }

  throw new Error('Invalid object-like schema')
}
