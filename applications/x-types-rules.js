import {isNotEmptyObject} from '@redocly/openapi-core/lib/utils.js'

export const noRefNeighbors = () => {
  return {
    ref: {
      enter(node, ctx) {
        const {$ref, $omit, ...rest} = node
        if (typeof $ref !== 'undefined' && Object.keys(rest).length > 0) {
          ctx.report({
            message: `You cannot have other properties alongside "$ref" in the same object`,
            location: ctx.location,
          })
        }
      },
    },
  }
}

export const noUndefinedDescriptions = () => {
  return {
    XTypeObject: {
      leave: (obj, ctx) => {
        if (isNotEmptyObject(obj.$descriptions)) {
          for (const key in obj.$descriptions) {
            if (obj[key] === undefined) {
              ctx.report({
                message: `Key "${key}" does not exist in the object type`,
                location: ctx.location.child(['$descriptions', key]).key(),
              })
            }
          }
        }
      },
    },
  }
}
