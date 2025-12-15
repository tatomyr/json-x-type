import fs from 'fs'
import {makeDocumentFromString} from '@redocly/openapi-core'
import {Location, parseRef} from '@redocly/openapi-core/lib/ref-utils.js'
import {dirname, join} from 'node:path'

const get =
  json =>
  ([key, ...segments]) => {
    return key === undefined ? json : get(json?.[key], segments)
  }

export class Context {
  constructor(absoluteRef) {
    const xTypeContent = fs.readFileSync(absoluteRef, 'utf-8')
    this.document = makeDocumentFromString(xTypeContent, absoluteRef)
  }

  resolve({$ref}, from) {
    const {uri, pointer} = parseRef($ref)
    const absoluteRef = this.document.source.absoluteRef

    let document

    if (/* $ref.startsWith('#') */ uri === '' || uri === null) {
      document = this.document
    } else if ($ref.startsWith('http')) {
      throw new Error('Not implemented yet!')
    } else {
      // assume it's a file path
      const newCtx = new Context(join(dirname(absoluteRef), $ref))
      document = newCtx.document
    }
    const node = get(document.parsed)(pointer)
    return {
      node,
      location: new Location(absoluteRef, $ref),
    }
  }
}
