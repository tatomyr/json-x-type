import {isRef} from '@redocly/openapi-core/lib/ref-utils.js'
import {
  generateSchemas,
  generateXTypes,
  generateNamedXTypes,
  createRefs,
} from './x-types-decorators.js'
import {noRefNeighbors, noUndefinedDescriptions} from './x-types-rules.js'
import {isObject} from './x-types-utils.js'

const getType = value => {
  try {
    if (typeof value === 'string') {
      return {type: 'string'}
    }

    if (typeof value === 'number') {
      return {type: 'number'}
    }

    if (typeof value === 'boolean') {
      return {type: 'boolean'}
    }

    // TODO: is there such a type?
    if (value === null) {
      return {type: 'null'}
    }

    if (Array.isArray(value)) {
      return {
        name: 'XTypeList',
        properties: {},
        items: {}, // FIXME: must be `getType`. This is only for bundling with circular refs to pass.
      }
    }

    if (isObject(value)) {
      if (typeof value.$array !== 'undefined') {
        return 'XTypeArray'
      }

      if (typeof value.$and !== 'undefined') {
        return 'XTypeAND'
      }

      if (isRef(value)) {
        // FIXME: when returning this, it fails on bundling when there are circular refs.
        return {
          properties: {type: 'string'},
        }
        // When returning this, it fails on linting when there are refs.
        // return undefined
      }

      if (
        typeof value.$readonly !== 'undefined' ||
        typeof value.$writeonly !== 'undefined'
      ) {
        return 'XTypeWriteOrReadOnly'
      }

      return 'XTypeObject'
    }
  } catch (err) {
    console.error(err)
  }
}

const XTypeArray = {
  properties: {
    $array: getType,
    // TODO: allow minItems, maxItems, uniqueItems, etc.?
  },
}

const XTypeAND = {
  properties: {
    $and: {
      name: 'XTypeList', // FIXME: should not accept `array` inside items
      properties: {},
      items: getType,
    },
  },
}

const XTypeObject = {
  properties: {
    $record: getType,
  },
  additionalProperties: getType,
}

const XTypeWriteOrReadOnly = {
  properties: {
    $readonly: getType,
    $writeonly: getType,
  },
}

export default () => ({
  id: 'x-types',

  decorators: {
    oas3: {
      'generate-schemas': generateSchemas,
      'generate-x-types': generateXTypes,
      'generate-named-x-types': generateNamedXTypes,
      'create-$refs': createRefs,
    },
  },

  rules: {
    oas3: {
      'no-$ref-neighbors': noRefNeighbors,
      'no-undefined-descriptions': noUndefinedDescriptions,
    },
  },

  configs: {
    all: {
      rules: {
        'x-types/no-$ref-neighbors': 'error',
        'x-types/no-undefined-descriptions': 'warn',
      },
    },
  },

  typeExtension: {
    oas3(types) {
      return {
        ...types,
        XTypeArray,
        XTypeAND,
        XTypeObject,
        XTypeWriteOrReadOnly,
        MediaType: {
          ...types.MediaType,
          properties: {
            ...types.MediaType.properties,
            'x-type': getType,
          },
        },
        Parameter: {
          ...types.Parameter,
          properties: {
            ...types.Parameter.properties,
            'x-type': getType,
          },
          requiredOneOf: ['schema', 'content', 'x-type'],
        },
        // TODO: This leads to $refs being replaced with the resolved values in the components section.
        // Do we want to do this? Is there any other way to avoid resolving $refs except for removing this?
        Components: {
          ...types.Components,
          properties: {
            ...types.Components.properties,
            'x-types': {
              name: 'NamedXTypes',
              properties: {},
              additionalProperties: getType,
            },
          },
        },
        // TODO: Add more types here
      }
    },
  },
})
