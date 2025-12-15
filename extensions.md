# Type extensions

It is possible to add additional context to types and values using extension keywords and type suffixes.
Main use cases include describing OpenAPI-compatible types.

## Extension keywords

### $descriptions

<!-- Consider adding $type (or $primitive) keyword instead, which would allow to specify $description along with the (primitive) type -->

The `$descriptions` keyword provides additional information about the object fields.
It must be an object at the same level as the fields it describes, mapping field names to their description strings:

```json
{
  "name": "string",
  "$descriptions": {
    "name": "The name of the user."
  }
}
```

Descriptions are propagated to the OpenAPI schema as the `description` fields of the corresponding properties.

<!--
Consider adding $readOnly and $writeOnly keywords back, but in a different way:

```yaml
foo: string
bar: number
$readOnly:
  - foo
```

This won't work for primitive type though.
-->

### $discriminator

Represents the OpenAPI [discriminator](https://spec.openapis.org/oas/latest.html#discriminator-object).
Its use is generally discouraged, and it is included mainly for compatibility with existing schemas.
The discriminator object should contain the `propertyName` field and, optionally, the `mapping` field.
The `mapping` field must contain links to the corresponding schemas (not to **X-Types**).

## Type suffixes

Type suffixes specify formats or modifiers for basic types.
They are denoted by the double colon notation (`::`).
A type can have at most one format suffix, but multiple modifier suffixes can be chained sequentially.

### String formats and modifiers

String formats include, among others, `date-time`, `email`, `uuid`, `uri`.
The list of possible string formats should correspond to the one described in [JSON Schema string formats](https://json-schema.org/understanding-json-schema/reference/string.html#format).

Example:

```json
"string::uuid"
```

String modifiers are `min`, `max` (for minimal and maximal length respectively), and `pattern`.
The corresponding values are passed in parentheses:

```json
"string::min(3)::max(30)::pattern([A-Za-z]+)"
```

The `pattern` modifier can also be used with the `$record` keyword to constrain dynamic object property names.

### Number formats and modifiers

For number types, the `integer` format suffix can be used to restrict values to whole numbers.
The number modifiers are: `min`, `max`, `x-min` (for exclusive minimum), and `x-max` (for exclusive maximum).
All range modifiers require a number value in parentheses:

```json
"number::integer::min(18)"
```

<!-- TODO: consider this syntax:
{"$array::min(1)": "any"}
Alternatively:
{"$array": "any", "minItems": 1}
-->

<!--
## Free form validation

**Note: This feature is under consideration.**

If a field needs to be validated against its context, a validation function can be used with the `$validate` keyword:

```json
{
  "country": ["🇺🇦", "🇺🇸"],
  "age": {
    "$validate": "(age, {country}) => (country === '🇺🇸' && age < 21 || country === '🇺🇦' && age < 18) && 'Too young for 🍺'"
  }
}
```

A validation function is a JavaScript function that accepts the value itself and its parent objects up to the root of the object.
It returns either a string with an error message (if validation fails) or a falsy value (if the field is valid).
-->
