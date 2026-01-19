import {describe, expect, test} from 'vitest'
import {translateJSONSchemaToXType} from '../json-schema-adapter.js'

describe('json-schema-adapter', () => {
  test('primitives', () => {
    expect(translateJSONSchemaToXType({type: 'null'}, {})).toEqual(null)
    expect(translateJSONSchemaToXType({type: 'string'}, {})).toEqual('string')
    expect(translateJSONSchemaToXType({type: 'integer'}, {})).toEqual(
      'number::integer'
    )
    expect(
      translateJSONSchemaToXType(
        {type: 'string', format: 'email', minLength: 5},
        {}
      )
    ).toEqual('string::email::min(5)')
    expect(
      translateJSONSchemaToXType(
        {type: 'number', minimum: 0, exclusiveMaximum: 100},
        {}
      )
    ).toEqual('number::min(0)::x-max(100)')
  })

  test('escapes reserved keywords in enum/const', () => {
    expect(
      translateJSONSchemaToXType({type: 'string', enum: ['string']}, {})
    ).toEqual('$literal:string')
    expect(
      translateJSONSchemaToXType(
        {type: 'string', enum: ['string', 'foo', 'number']},
        {}
      )
    ).toEqual(['$literal:string', 'foo', '$literal:number'])
    expect(
      translateJSONSchemaToXType({type: 'string', const: 'boolean'}, {})
    ).toEqual('$literal:boolean')
  })

  test('objects and arrays', () => {
    expect(translateJSONSchemaToXType({type: 'object'}, {})).toEqual({
      $record: 'any',
    })
    expect(
      translateJSONSchemaToXType(
        {type: 'object', properties: {id: {type: 'number'}}, required: ['id']},
        {}
      )
    ).toEqual({id: 'number'})
    expect(
      translateJSONSchemaToXType(
        {type: 'object', properties: {$x: {type: 'string'}}, required: ['$x']},
        {}
      )
    ).toEqual({'$literal:$x': 'string'})
    expect(
      translateJSONSchemaToXType({type: 'array', items: {type: 'string'}}, {})
    ).toEqual({$array: 'string'})
  })

  test('composition', () => {
    expect(
      translateJSONSchemaToXType(
        {
          allOf: [
            {type: 'object', properties: {foo: {type: 'string'}}},
            {type: 'object', properties: {bar: {type: 'number'}}},
          ],
        },
        {}
      )
    ).toEqual({$and: [{foo: 'string'}, {bar: 'number'}]})
    expect(
      translateJSONSchemaToXType(
        {oneOf: [{type: 'string'}, {type: 'number'}]},
        {}
      )
    ).toEqual(['string', 'number'])
  })
})
