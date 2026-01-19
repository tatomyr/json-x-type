import {cleanupSchema} from './x-types-utils.js'
import {translateXTypeToSchema} from './x-types-adapter.js'
import {resolveAndMerge} from './x-types-resolver.js'
import {translateJSONSchemaToXType} from './json-schema-adapter.js'
import {isRef} from '@redocly/openapi-core'

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
  let rootComponents
  return {
    Components: {
      leave(components, ctx) {
        components['x-types'] = namedXTypes
      },
      enter(components, ctx) {
        rootComponents = components
      },
      NamedSchemas: {
        Schema: {
          enter(schema, ctx) {
            namedXTypes[ctx.key] = translateJSONSchemaToXType(schema, ctx)
            const mapping = namedXTypes[ctx.key]._mapping
            const propertyName = namedXTypes[ctx.key]._propertyName

            if (!mapping || !propertyName) {
              return // Skip if there's no discriminator mapping or propertyName
            }

            namedXTypes['Base_' + ctx.key] = namedXTypes[ctx.key]._baseObject
            for (const [discriminatorValue, $ref] of Object.entries(mapping)) {
              const componentName = $ref.split('/').at(-1)

              const schemaComponent = rootComponents.schemas[componentName]
              if (Array.isArray(schemaComponent?.allOf)) {
                for (const item of schemaComponent.allOf) {
                  if (
                    isRef(item) &&
                    item.$ref === '#/components/schemas/' + ctx.key
                  ) {
                    item.$ref = '#/components/x-types/Base_' + ctx.key
                  }
                }
                // Inject discriminator property into the schema component
                schemaComponent.allOf.push({
                  type: 'object',
                  properties: {
                    [propertyName]: {type: 'string', const: discriminatorValue},
                  },
                })
              }

              const xTypeComponent = namedXTypes[componentName]
              if (Array.isArray(xTypeComponent?.$and)) {
                for (const item of xTypeComponent.$and) {
                  if (
                    isRef(item) &&
                    item.$ref === '#/components/x-types/' + ctx.key
                  ) {
                    item.$ref = '#/components/x-types/Base_' + ctx.key
                  }
                }
                // Inject discriminator property into the x-type component
                xTypeComponent.$and.push({
                  [propertyName]: discriminatorValue,
                })
              }
            }
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
