import {describe, expect, test} from 'vitest'
import {translateXTypeToSchema} from '../x-types-adapter.js'

describe('adapter', () => {
  test('translates primitive types', () => {
    expect(translateXTypeToSchema('string')).toEqual({type: 'string'})
    expect(translateXTypeToSchema('number')).toEqual({type: 'number'})
    expect(translateXTypeToSchema('boolean')).toEqual({type: 'boolean'})
    expect(translateXTypeToSchema(null)).toEqual({type: 'null'})
    expect(translateXTypeToSchema('any')).toEqual({})
  })

  test('literals', () => {
    expect(
      translateXTypeToSchema({'$literal:$record': '$literal:boolean'})
    ).toEqual({
      type: 'object',
      properties: {$record: {type: 'string', enum: ['boolean']}},
      additionalProperties: false,
      required: ['$record'],
    })
  })

  test('`undefined` -> `never`', () => {
    expect(translateXTypeToSchema('undefined')).toEqual(undefined)
  })

  test('OR', () => {
    expect(translateXTypeToSchema(['string', 'number'])).toEqual({
      anyOf: [{type: 'string'}, {type: 'number'}],
    })
    expect(translateXTypeToSchema(['foo', 'bar'])).toEqual({
      type: 'string',
      enum: ['foo', 'bar'],
    })
    expect(translateXTypeToSchema(['string', 'undefined'])).toEqual({
      type: 'string',
    })
    expect(translateXTypeToSchema(['undefined'])).toEqual(undefined)
    expect(
      translateXTypeToSchema({
        Required: ['foo', 'number'],
        Conditional: ['string', 'undefined'],
      })
    ).toEqual({
      type: 'object',
      properties: {
        Required: {
          anyOf: [{type: 'string', enum: ['foo']}, {type: 'number'}],
        },
        Conditional: {type: 'string'},
      },
      additionalProperties: false,
      required: ['Required'],
    })
  })

  test('arrays', () => {
    expect(translateXTypeToSchema({$array: 'string'})).toEqual({
      type: 'array',
      items: {type: 'string'},
    })
  })

  test('records', () => {
    expect(translateXTypeToSchema({$record: 'number'})).toEqual({
      type: 'object',
      properties: {},
      additionalProperties: {type: 'number'},
      required: [],
    })
  })

  test('string formats and modifiers', () => {
    expect(translateXTypeToSchema('string::date-time')).toEqual({
      type: 'string',
      format: 'date-time',
    })
    expect(
      translateXTypeToSchema({
        '$record::pattern(some pattern)': 'string::min(10)::max(100)',
      })
    ).toEqual({
      type: 'object',
      patternProperties: {
        'some pattern': {
          type: 'string',
          maxLength: 100,
          minLength: 10,
        },
      },
      properties: {},
      additionalProperties: false,
      required: [],
    })
  })

  test('number formats and modifiers', () => {
    expect(translateXTypeToSchema('number::min(0)::x-max(1)')).toEqual({
      type: 'number',
      minimum: 0,
      exclusiveMaximum: 1,
    })
    expect(translateXTypeToSchema('number::integer')).toEqual({
      type: 'integer',
    })
  })
})
