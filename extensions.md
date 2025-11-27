# Types extending

It is possible to add additional context to types and values using extension keywords and suffixes.

## Extension keywords

| Keyword                                           | Description                                                        |
| ------------------------------------------------- | ------------------------------------------------------------------ |
| $descriptions [🔗](#descriptions)                 | An object containing descriptions of the fields at the same level. |
| $writeonly [🔗](#read-only-and-write-only-fields) | Describes a field that can only appear in requests.                |
| $readonly [🔗](#read-only-and-write-only-fields)  | Describes a field that can only appear in responses.               |
| $discriminator [🔗](#discriminator)               | Represents an OpenAPI discriminator.                               |

These keywords extend the core type system and are helpful for describing OpenAPI-compatible types.

### Descriptions

Descriptions provide additional information about the fields.
They can only be used in objects:

```json
{
  "name": "string",
  "$descriptions": {
    "name": "The name of the user."
  }
}
```

Descriptions are propagated to the OpenAPI schema as the `description` fields of the corresponding properties.

### Read-only and write-only fields

The `$writeonly` and `$readonly` fields contain properties that should be present only in requests or responses respectively.
Consider this example:

```json
{
  "name": "string",
  "password": {"$writeonly": "string"},
  "id": {"$readonly": "string"},
  "createdAt": {"$readonly": "string::date-time"}
}
```

The `password` field is only expected in requests, while `id` and `createdAt` are expected in responses.
The `name` field is expected in both requests and responses.

### Discriminator

Represents the OpenAPI discriminator ([🔗](https://spec.openapis.org/oas/latest.html#discriminator-object)).
Its use is generally discouraged, and it is included mainly for compatibility with existing schemas.
It should contain the `propertyName` field and, optionally, the `mapping` field.
The `mapping` field must contain links to the corresponding schemas (not to x-types).

## Suffixes

Suffixes are intended to specify different formats or other properties of the basic types.
They are denoted by the double colon notation.
There should be no more than one format specified.
Suffixes can be sequentially chained.

### String formats and modifiers

String formats include, among others, `date-time`, `email`, `uuid`, `uri`.
The list of possible string formats should correspond to the one described in [JSON Schema string formats](https://json-schema.org/understanding-json-schema/reference/string.html#format).

Example:

```json
"string::uuid"
```

The modifiers are `min`, `max` (for minimal and maximal length respectively), and `pattern`.
The corresponding values are passed in parentheses:

```json
"string::min(3)::max(30)::pattern([A-Za-z]+)"
```

The `pattern` modifier can be also used with the `$record` keyword.

### Number formats and modifiers

The only supported number format is `integer`, and the modifiers are: `min`, `max`, `x-min` (for exclusive minimum), `x-max` (for exclusive maximum).
The range modifiers require a number value in parenthesis:

```json
"number::integer::min(18)"
```

<!-- TODO: consider this syntax:
{"$array::min(1)": "any"}
Alternatively:
{"$array": "any", "minItems": 1}
-->

## Free form validation

> Under consideration.

If a field needs to be validated against its context, the validation function can be used:

```json
{
  "country": ["🇺🇦", "🇺🇸"],
  "age": "(age, {country}) => (country === '🇺🇸' && age < 21 || country === '🇺🇦' && age < 18) && 'Too young for 🍺'"
}
```

A validation function is a JavaScript function that accepts the value itself and its parents up to the root of the object and returns either a string with an error message or a falsy value if the field is valid.
