import {cleanupSchema} from './x-types-utils.js'
import {translateXTypeToSchema} from './x-types-adapter.js'
import {resolveAndMerge} from './x-types-resolver.js'
import {translateJSONSchemaToXType} from './json-schema-adapter.js'

export const generateNamedSchemas = opts => {
  const namedSchemas = {}
  return {
    Components: {
      enter(components, ctx) {
        const xTypes = components['x-types'] || {}
        for (const key in xTypes) {
          const xType = xTypes[key]

          const resolvedXType = resolveAndMerge(xType, {
            ...ctx,
            _circularRefsMaxDepth: opts?.depth,
          })
          const schema = cleanupSchema(translateXTypeToSchema(resolvedXType))
          namedSchemas[key] = schema
        }
      },
      leave(components) {
        components['schemas'] = {
          ...components['schemas'],
          ...namedSchemas,
        }
      },
    },
  }
}

export const generateSchemas = opts => {
  return {
    RequestBody: {
      // Same as in the Response but different _mode.
      MediaType: {
        leave(mediaType, ctx) {
          const original = mediaType['x-type']
          if (typeof original === 'undefined') {
            return
          }
          const resolvedXType = resolveAndMerge(original, {
            ...ctx,
            _circularRefsMaxDepth: opts?.depth,
            _mode: 'request',
          })
          const schema = cleanupSchema(translateXTypeToSchema(resolvedXType))
          mediaType.schema = schema
        },
      },
    },
    Response: {
      // Same as in the RequestBody but different _mode.
      MediaType: {
        leave(mediaType, ctx) {
          const original = mediaType['x-type']
          if (typeof original === 'undefined') {
            return
          }
          const resolvedXType = resolveAndMerge(original, {
            ...ctx,
            _circularRefsMaxDepth: opts?.depth,
            _mode: 'response',
          })
          const schema = cleanupSchema(translateXTypeToSchema(resolvedXType))
          mediaType.schema = schema
        },
      },
    },
    Parameter: {
      leave(parameter, ctx) {
        const original = parameter['x-type']
        if (typeof original === 'undefined') {
          return
        }
        const resolvedXType = resolveAndMerge(original, {
          ...ctx,
          _circularRefsMaxDepth: opts?.depth,
          _mode: 'request',
        })
        const schema = cleanupSchema(translateXTypeToSchema(resolvedXType))
        parameter.schema = schema
      },
    },
  }
}

// TODO: WIP
export const generateNamedXTypes = opts => {
  const namedXTypes = {}
  return {
    Components: {
      leave(components, ctx) {
        components['x-types'] = namedXTypes
      },
      NamedSchemas: {
        Schema: {
          enter(schema, ctx) {
            namedXTypes[ctx.key] = translateJSONSchemaToXType(schema, ctx)
          },
        },
      },
    },
  }
}

// TODO: WIP
export const generateXTypes = opts => {
  return {
    RequestBody: {
      // Same as in the Response but different _mode.
      MediaType: {
        leave(mediaType, ctx) {
          const original = mediaType.schema
          if (typeof original === 'undefined') {
            return
          }
          const xType = translateJSONSchemaToXType(original, {
            ...ctx,
            _mode: 'request',
          })
          mediaType['x-type'] = xType
          delete mediaType.schema
        },
      },
    },
    Response: {
      // Same as in the RequestBody but different _mode.
      MediaType: {
        leave(mediaType, ctx) {
          const original = mediaType.schema
          if (typeof original === 'undefined') {
            return
          }
          const xType = translateJSONSchemaToXType(original, {
            ...ctx,
            _mode: 'response',
          })
          mediaType['x-type'] = xType
          delete mediaType.schema
        },
      },
      // TODO: Header too?
    },
    Parameter: {
      leave(parameter, ctx) {
        const original = parameter.schema
        if (typeof original === 'undefined') {
          return
        }
        const xType = translateJSONSchemaToXType(original, {
          ...ctx,
          _mode: 'request',
        })
        parameter['x-type'] = xType
        delete parameter.schema
      },
    },
  }
}

// WIP
export const removeXTypes = opts => {
  return {
    MediaType: {
      enter(mediaType, ctx) {
        delete mediaType['x-type']
      },
    },
    // TODO: Header too?
    Parameter: {
      enter(parameter, ctx) {
        delete parameter['x-type']
      },
    },

    Components: {
      // RequestBodies(components) {

      // },
      enter(components) {
        delete components['x-types']
      },
    },
  }
}

export const removeSchemas = opts => {
  return {
    Components: {
      enter(components) {
        delete components['schemas']
      },
    },
  }
}
