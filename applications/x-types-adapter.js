import {isNotEmptyObject} from '@redocly/openapi-core/lib/utils.js'
import {isObject} from './x-types-utils.js'

const SUFFIXES = {
  string: [
    [/^date-time$/, () => ({format: 'date-time'})],
    [/^date$/, () => ({format: 'date'})],
    [/^email$/, () => ({format: 'email'})],
    [/^uuid$/, () => ({format: 'uuid'})],
    [/^binary$/, () => ({format: 'binary'})],
    [/^byte$/, () => ({format: 'byte'})],
    [/^password$/, () => ({format: 'password'})],
    [/^uri$/, () => ({format: 'uri'})],
    [/^url$/, () => ({format: 'url'})],
    [/^uuid$/, () => ({format: 'uuid'})],

    [/^pattern\((?<value>.+)\)$/, match => ({pattern: match?.groups?.value})],
    [
      /^min\((?<value>[0-9]+)\)$/,
      match => ({minLength: +match?.groups?.value}),
    ],
    [
      /^max\((?<value>[0-9]+)\)$/,
      match => ({maxLength: +match?.groups?.value}),
    ],
  ],
  number: [
    [/^integer$/, () => ({type: 'integer'})],
    [/^min\((?<value>[0-9]+)\)$/, match => ({minimum: +match?.groups?.value})],
    [/^max\((?<value>[0-9]+)\)$/, match => ({maximum: +match?.groups?.value})],
    [
      /^x-min\((?<value>[0-9]+)\)$/,
      match => ({exclusiveMinimum: +match?.groups?.value}),
    ],
    [
      /^x-max\((?<value>[0-9]+)\)$/,
      match => ({exclusiveMaximum: +match?.groups?.value}),
    ],
  ],
}

// The xType must be resolved before being translated to JSON Schema because if it contains $refs, some logic could be applied incorrectly.
export const translateXTypeToSchema = xType => {
  if (typeof xType === 'undefined') {
    throw new Error('Expected "x-type" but got "undefined"')
  }

  if (xType === null) {
    return {type: 'null'}
  }

  if (xType?.$ref) {
    throw new Error(`Unexpected unresolved $ref: ${JSON.stringify(xType.$ref)}`)
  }

  if (xType?.$and) {
    throw new Error(`Unexpected unresolved $and: ${JSON.stringify(xType.$and)}`)
  }

  if (xType === 'string') {
    return {type: 'string'}
  }
  if (typeof xType === 'string' && xType.startsWith('string::')) {
    const suffixes = xType.slice('string::'.length).split('::')
    const modifiers = {}
    for (const suffix of suffixes) {
      for (const [re, toJSONSchema] of SUFFIXES.string) {
        const match = re.exec(suffix)
        if (match) {
          Object.assign(modifiers, toJSONSchema(match))
        }
      }
    }
    if (isNotEmptyObject(modifiers)) {
      return {type: 'string', ...modifiers}
    }

    throw new Error(`Unsupported string format: ${xType}.`)
  }

  if (xType === 'number') {
    return {type: 'number'}
  }
  if (typeof xType === 'string' && xType.startsWith('number::')) {
    const suffixes = xType.slice('number::'.length).split('::')
    const modifiers = {}
    for (const suffix of suffixes) {
      for (const [re, toJSONSchema] of SUFFIXES.number) {
        const match = re.exec(suffix)
        if (match) {
          Object.assign(modifiers, toJSONSchema(match))
        }
      }
    }
    if (isNotEmptyObject(modifiers)) {
      return {type: 'number', ...modifiers}
    }

    throw new Error(`Unsupported number format: ${xType}.`)
  }

  if (xType === 'boolean') {
    return {type: 'boolean'}
  }

  if (xType === 'any') {
    return {}
  }

  if (xType === 'undefined') {
    return undefined
  }

  // Handle array types
  if (typeof xType.$array !== 'undefined') {
    // TODO: handle array modifiers
    return {type: 'array', items: translateXTypeToSchema(xType.$array)}
  }

  // Handle $literal types
  if (typeof xType === 'string' && xType.startsWith('$literal:')) {
    return {type: 'string', enum: [xType.slice('$literal:'.length)]}
  }

  // Handle primitive literals
  if (
    (typeof xType === 'string') |
    (typeof xType === 'number') |
    (typeof xType === 'boolean')
  ) {
    return {type: typeof xType, enum: [xType]}
  }

  // Handle OR types
  if (Array.isArray(xType)) {
    const normalized = xType
      .filter(type => type !== 'undefined')
      .map(translateXTypeToSchema)
    if (normalized.length === 0) {
      return undefined
    }
    if (normalized.length === 1) {
      return normalized[0]
    }
    // Triage the normalized array into string and other
    const normalizedStringEnums = normalized.filter(
      schema => schema.type === 'string' && schema.enum
    )
    const normalizedString =
      normalizedStringEnums.length > 0
        ? {
            type: 'string',
            enum: normalizedStringEnums.map(schema => schema.enum).flat(),
          }
        : undefined
    const normalizedOthers = normalized.filter(
      schema => schema.type !== 'string'
    )
    if (normalizedOthers.length === 0) {
      return normalizedString
    }
    if (!normalizedString) {
      return {anyOf: normalized}
    }
    return {
      anyOf: [normalizedString, ...normalizedOthers],
    }
  }

  // Handle object types
  if (isObject(xType)) {
    let properties = {}
    let patternProperties = {}
    let required = []
    const {$record, $descriptions, $discriminator, ...props} = xType

    const additionalProperties =
      typeof $record === 'undefined' ? false : translateXTypeToSchema($record)

    for (const key in props) {
      if (key.startsWith('$record::pattern(') && key.endsWith(')')) {
        // Handle patternProperties
        const pattern = key.slice('$record::pattern('.length, -1)
        patternProperties[pattern] = translateXTypeToSchema(props[key])
      } else if (!key.startsWith('$') || key.startsWith('$literal:')) {
        // Handle regular properties
        const realKey = key.startsWith('$literal:')
          ? key.slice('$literal:'.length)
          : key
        properties[realKey] = translateXTypeToSchema(props[key])
        if (
          (Array.isArray(props[key]) && props[key].includes('undefined')) ||
          props[key] === 'undefined'
        ) {
          // Skip the `undefined` x-type.
        } else {
          required.push(realKey)
        }
      }
    }

    // All fields at this level could have descriptions defined inside the $descriptions field.
    for (const describedPropertyKey in $descriptions) {
      if (isObject(properties[describedPropertyKey])) {
        properties[describedPropertyKey] = {
          description: $descriptions[describedPropertyKey],
          ...properties[describedPropertyKey],
        }
      }
    }

    return {
      type: 'object',
      properties,
      required,
      additionalProperties,
      ...(isNotEmptyObject(patternProperties) && {patternProperties}),
      ...($discriminator && {discriminator: $discriminator}),
    }
  }

  throw new Error('Cannot process x-type:', xType)
}
