// Experimental feature

import {isRef, isPlainObject, isEmptyObject} from '@redocly/openapi-core'
import {RESERVED_KEYWORDS} from './x-types-utils.js'

const escapeReserved = value => {
  if (Array.isArray(value)) {
    return value.map(escapeReserved)
  }
  if (RESERVED_KEYWORDS.includes(value)) {
    return `$literal:${value}`
  }
  return value
}

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
        return escapeReserved(schema.enum[0])
      }
      return escapeReserved(schema.enum)
    }
    if (schema.const) {
      return escapeReserved(schema.const)
    }

    let t = schema.type
    if (schema.type === 'integer') {
      if (schema.format !== undefined) {
        t = `number::${schema.format}`
      } else {
        t = 'number::integer'
      }
    }
    if (
      schema.format &&
      schema.type !== 'number' &&
      schema.type !== 'integer'
    ) {
      t += `::${schema.format}`
    }
    if (schema.pattern !== undefined) {
      t += `::pattern(${schema.pattern})`
    }
    if (schema.minimum !== undefined) {
      t += `::min(${schema.minimum})`
    }
    if (schema.maximum !== undefined) {
      t += `::max(${schema.maximum})`
    }
    if (schema.exclusiveMinimum !== undefined) {
      t += `::x-min(${schema.exclusiveMinimum})`
    }
    if (schema.exclusiveMaximum !== undefined) {
      t += `::x-max(${schema.exclusiveMaximum})`
    }
    if (schema.minLength !== undefined) {
      t += `::min(${schema.minLength})`
    }
    if (schema.maxLength !== undefined) {
      t += `::max(${schema.maxLength})`
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
      console.log('# Already an x-type $ref:', schema.$ref)
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
  // Handle arrays
  if (isPlainObject(schema.items)) {
    const $array = translateJSONSchemaToXType(schema.items, ctx)
    return {$array}
  }

  // Handle objects
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

  if (!isEmptyObject($descriptions)) {
    properties.$descriptions = $descriptions
  }

  // Handle discriminator 🐒
  if (isPlainObject(schema.discriminator)) {
    const {propertyName, mapping} = schema.discriminator
    if (!schema.oneOf && !schema.anyOf && isPlainObject(mapping)) {
      // handle implicit discriminator usage with allOf
      const $or = Object.values(mapping).map($ref =>
        translateJSONSchemaToXType({$ref}, ctx)
      )

      $or._mapping = mapping
      $or._propertyName = propertyName
      $or._baseObject = properties
      $or._componentName = ctx.key
      return $or
    }
  }

  if (!isEmptyObject(properties)) {
    return properties
  }

  throw new Error('Invalid object-like schema')
}
