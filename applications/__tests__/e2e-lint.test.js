import {describe, expect, test} from 'vitest'
import {runCommand, stripCWD} from './e2e-utils'

describe('lint', () => {
  test('general openapi case (using preprocessors to transform)', () => {
    const {stderr} = runCommand(
      'redocly lint applications/resources/openapi.yaml --config=applications/x-type.redocly.yaml'
    )
    expect(stderr).toMatchSnapshot()
  })

  test('openapi with mixed types', () => {
    const {stderr} = runCommand(
      'redocly lint applications/resources/openapi-mixed-types.yaml  --config=applications/x-type.redocly.yaml'
    )
    expect(stripCWD(stderr)).toMatchSnapshot()
  })

  test('openapi that contains wrong and correct $ands', () => {
    const {stderr} = runCommand(
      'redocly lint applications/resources/openapi-and.yaml  --config=applications/x-type.redocly.yaml'
    )
    expect(stripCWD(stderr)).toMatchSnapshot()
  })

  test('openapi with x-types inside parameters', () => {
    const {stderr} = runCommand(
      'redocly lint applications/resources/openapi-with-x-types-inside-parameters.yaml --config=applications/x-type.redocly.yaml'
    )
    expect(stderr).toMatchSnapshot()
  })

  test('openapi with ORs (including nested and referenced)', () => {
    const {stderr} = runCommand(
      'redocly lint applications/resources/openapi-or.yaml --config=applications/x-type.redocly.yaml'
    )
    expect(stderr).toMatchSnapshot()
  })

  test('distribytivity in x-types', () => {
    const {stderr} = runCommand(
      'redocly lint applications/resources/openapi-with-nested-ors-in-ands.yaml --config=applications/x-type.redocly.yaml'
    )
    expect(stderr).toMatchSnapshot()
  })

  test('x-type described with x-type itself', () => {
    const {stderr} = runCommand(
      'redocly lint applications/resources/x-types-described-with-x-type.yaml  --config=applications/x-type.redocly.yaml'
    )
    expect(stripCWD(stderr)).toMatchSnapshot()
  })

  test('openapi with external $refs', () => {
    const {stderr} = runCommand(
      'redocly lint applications/resources/openapi-with-external-refs.yaml  --config=applications/x-type.redocly.yaml'
    )
    expect(stripCWD(stderr)).toMatchSnapshot()
  })

  test('openapi with omitting fields', () => {
    const {stderr} = runCommand(
      'redocly lint applications/resources/openapi-omit.yaml --config=applications/x-type.redocly.yaml'
    )
    expect(stripCWD(stderr)).toMatchSnapshot()
  })

  test('openapi with $and and $description', () => {
    const {stderr} = runCommand(
      'redocly lint applications/resources/openapi-and-with-descriptions.yaml --config=applications/x-type.redocly.yaml'
    )
    expect(stripCWD(stderr)).toMatchSnapshot()
  })

  test('openapi with circular refs', () => {
    const {stderr} = runCommand(
      'redocly lint applications/resources/openapi-with-circular-refs.yaml --config=applications/x-type.redocly.yaml'
    )
    expect(stripCWD(stderr)).toMatchSnapshot()
  })

  test('openapi with redundant key in $descriptions', () => {
    const {stdout: stderr} = runCommand(
      'redocly lint applications/resources/openapi-with-redundant-description.yaml --config=applications/x-type.redocly.yaml 2>&1'
    )
    expect(stripCWD(stderr)).toMatchSnapshot()
  })
})
