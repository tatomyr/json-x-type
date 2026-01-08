import {describe, expect, test} from 'vitest'
import {runCommand} from './e2e-utils'

describe('bundle', () => {
  test('bundle and translate x-type to schema (for regular $ref objects)', () => {
    const {stdout} = runCommand(
      'redocly bundle applications/resources/openapi.yaml --config=applications/x-type.redocly.yaml'
    )
    expect(stdout).toMatchSnapshot()
  })

  test('do not add schemas if there is no x-type', () => {
    const {stdout} = runCommand(
      'redocly bundle applications/resources/openapi-without-x-types.yaml --config=applications/x-type.redocly.yaml'
    )
    expect(stdout).toMatchSnapshot()
  })

  test('resolve different type of $refs on different levels and ignore wrong $refs (with --force) when bundling', () => {
    const {stdout} = runCommand(
      'redocly bundle applications/resources/openapi-with-refs.yaml --force --config=applications/x-type.redocly.yaml'
    )
    expect(stdout).toMatchSnapshot()
  })

  test('do not bundle an openapi with type never', () => {
    const {stderr} = runCommand(
      'redocly bundle applications/resources/openapi-never.yaml --config=applications/x-type.redocly.yaml'
    )
    expect(stderr).toMatchSnapshot()
  })

  test('resolve and translate $ands', () => {
    const {stdout} = runCommand(
      'redocly bundle applications/resources/openapi-and.yaml --config=applications/x-type.redocly.yaml'
    )
    expect(stdout).toMatchSnapshot()
  })

  test('translate x-type to schema inside parameters', () => {
    const {stdout} = runCommand(
      'redocly bundle applications/resources/openapi-with-x-types-inside-parameters.yaml --config=applications/x-type.redocly.yaml'
    )
    expect(stdout).toMatchSnapshot()
  })

  test('translate x-types inside ORs', () => {
    const {stdout} = runCommand(
      'redocly bundle applications/resources/openapi-or.yaml --config=applications/x-type.redocly.yaml'
    )
    expect(stdout).toMatchSnapshot()
  })

  test('translate string and number formats', () => {
    const {stdout} = runCommand(
      'redocly bundle applications/resources/openapi-type-formats.yaml --config=applications/x-type.redocly.yaml'
    )
    expect(stdout).toMatchSnapshot()
  })

  test('distributivity in x-types', () => {
    const {stdout} = runCommand(
      'redocly bundle applications/resources/openapi-with-nested-ors-in-ands.yaml --config=applications/x-type.redocly.yaml'
    )
    expect(stdout).toMatchSnapshot()
  })

  test('replace existing schemas', () => {
    const {stdout: notPreserved} = runCommand(
      'redocly bundle applications/resources/openapi-with-schema.yaml --config=applications/x-type.redocly.yaml'
    )
    expect(notPreserved).toMatchSnapshot()
  })

  test('descriptions in x-types', () => {
    const {stdout} = runCommand(
      'redocly bundle applications/resources/openapi-with-descriptions.yaml --config=applications/x-type.redocly.yaml'
    )
    expect(stdout).toMatchSnapshot()
  })

  test('generate x-types from JSON Schemas (petstore)', () => {
    const {stdout: toXTypes} = runCommand(
      'redocly bundle applications/resources/pets.yaml --config=applications/generate-x-types.redocly.yaml'
    )
    expect(toXTypes).toMatchFileSnapshot('file-snapshots/pets-to-x-types.yaml')
  })

  test('generate x-types from JSON Schemas (readOnly and writeOnly)', () => {
    const {stdout} = runCommand(
      'redocly bundle applications/resources/openapi-from-readonly-writeonly-to-omit.yaml --config=applications/generate-x-types.redocly.yaml'
    )
    expect(stdout).toMatchSnapshot()
  })

  test('openapi with circular refs to writeOnly', () => {
    const {stdout} = runCommand(
      'redocly bundle applications/resources/openapi-writeonly-circular.yaml --config=applications/x-type.redocly.yaml'
    )
    expect(stdout).toMatchSnapshot()
  })

  test('openapi with omitting fields', () => {
    const {stdout} = runCommand(
      'redocly bundle applications/resources/openapi-omit.yaml --config=applications/x-type.redocly.yaml'
    )
    // FIXME: the $omit field merges directly into the resolved object. this may cause issues if $ref is not an object
    expect(stdout).toMatchSnapshot()
  })

  test('openapi with $-prefixed fields', () => {
    const {stdout} = runCommand(
      'redocly bundle applications/resources/openapi-dollar-prefixed-fields.yaml --config=applications/x-type.redocly.yaml'
    )
    expect(stdout).toMatchSnapshot()
  })

  test('openapi with $and and $description', () => {
    const {stdout} = runCommand(
      'redocly bundle applications/resources/openapi-and-with-descriptions.yaml --config=applications/x-type.redocly.yaml'
    )
    expect(stdout).toMatchSnapshot()
  })

  test('openapi with discriminators converted to schemas', () => {
    const {stdout} = runCommand(
      'redocly bundle applications/resources/openapi-with-discriminators.yaml --config=applications/x-type.redocly.yaml'
    )
    expect(stdout).toMatchSnapshot()
  })

  test('openapi with discriminators converted to x-types', () => {
    const {stdout} = runCommand(
      'redocly bundle applications/resources/openapi-with-discriminators.yaml --config=applications/generate-x-types.redocly.yaml'
    )
    expect(stdout).toMatchSnapshot()
  })

  test('openapi with circular refs converted to schemas', () => {
    const {stdout} = runCommand(
      'redocly bundle applications/resources/openapi-with-circular-refs.yaml --config=applications/x-type.redocly.yaml'
    )
    expect(stdout).toMatchSnapshot()
  })
})
