# JSON X-Type

**JSON X-Type** (or **X-Type** for short) is a type notation for describing JSON data with an emphasis on being intuitive to write and easy to read.

Any [valid JSON](https://www.json.org/) can be validated against an **X-Type** definition.

**X-Type** can be described by itself ([🔗](./x-type.yaml)).

## Primitive types and literals

| Keyword   | Description                          |
| --------- | ------------------------------------ |
| string    | String type.                         |
| number    | Number type.                         |
| boolean   | Boolean type.                        |
| undefined | Indicates that the value is not set. |
| any       | Any value (not validated).           |

Primitive types are the basic building blocks of **X-Type** and can be used in JSON values.
Any other primitive values (strings, numbers, booleans, or `null`) are considered literals.
Note: To use a reserved keyword as a literal (rather than its special meaning), escape it with the [$literal](#literals-escaping) prefix.

## Structural types

### Objects

Object literals define object-like structures:

```json
{
  "name": "string",
  "age": "number"
}
```

The example above defines an object with two required properties.

Any `$`-prefixed keys in object literals are reserved for special keywords.
To use a literal key that starts with `$`, escape it with the [$literal](#literals-escaping) prefix.

### Records

To describe objects with dynamic properties, use special `$record` keyword:

```json
{
  "$record": "boolean"
}
```

This defines an object where any property has a boolean value.

TypeScript analogy: `Record<string, T>`.

Note: Literal properties can be combined with dynamic ones, although this approach is not generally recommended for data organization:

```json
{
  "name": "string",
  "$record": "any"
}
```

This defines an object with a required `name` property of type string, plus any number of additional properties of any type.

The `$record` key puts constraints on all properties, including defined ones.

### Array type

Arrays can be defined using special `$array` keyword:

```json
{
  "$array": "string"
}
```

This defines an array of strings.

Note: In JSON, arrays cannot contain the `undefined` value.
Therefore, `{"$array": "undefined"}` can only be satisfied by an empty array.
Similarly, arrays cannot contain optional types like `{"$array": ["string", "undefined"]}`:
such a definition yields an array of strings only, or an empty array.
Such definitions generally do not make much sense and should be avoided.

TypeScript analogy: `Array<T>` or `T[]`.

<!--
### Tuple types (under consideration)

```json
{
  "$tuple": [
    "number",
    "number"
  ]
}
```

OR

```json
{
  $0: "number",
  $1: "number"
}
```

The first form contradicts the exclusive use of arrays for unions, while the second is less intuitive.

Another option is to use something in the middle:

```json
{
  "$tuple": {
    "0": "number",
    "1": "number"
  }
}
```
-->

## References

Use `$ref` to refer to other **X-Types** via [JSON Pointer](https://datatracker.ietf.org/doc/html/rfc6901):

```json
{
  "UserList": {
    "$array": {
      "$ref": "#/User"
    }
  },
  "User": {
    "name": "string",
    "age": "number"
  }
}
```

The `UserList` uses a reference to the `User` type for describing an array of users.

References resolve relative to the file they appear in.
If a reference cannot be resolved, it should be treated as `any`.
Any other properties alongside `$ref` must be ignored, except for explicitly mentioned ones in this document.

## Type composition

### Union types

Array literals define multiple options, one of which is applicable:

```json
["string", "undefined"]
```

This defines an optional string type.

TypeScript analogy: `A | B`.

### Intersection types

Combine several types (mainly object types) into one using `$and`:

```json
{
  "$and": [
    {
      "foo": "string"
    },
    {
      "bar": "number"
    }
  ]
}
```

The result is an object that includes all properties from every member:

```json
{
  "foo": "string",
  "bar": "number"
}
```

Intersection of a wider and a narrower type results in the narrower one.
Intersection of incompatible types (e.g., strings and booleans) must result in the undefined type.

TypeScript analogy: `A & B`.

### Omitting properties

To omit specific properties from a referenced type, use the `$omit` keyword alongside `$ref`:

```json
{
  "$ref": "user.json",
  "$omit": ["id", "createdAt"]
}
```

The resulting type is the resolved type from `user.json` without the `id` and `createdAt` properties.

Note: `$omit` applies to the final type resolved from the reference.

Using `$omit` removes properties completely, allowing them to be redefined.
In contrast, intersecting with the undefined type locks the expected property value to `undefined`.

With `$omit`, the property can be redefined:

```json
{
  "$and": [
    {
      "$ref": "user.json",
      "$omit": ["id"]
    },
    {
      "id": "number"
    }
  ]
}
```

Result: `{ "id": "number", ... }`

Without `$omit`, intersection yields the narrower type:

```json
{
  "$and": [
    {
      "$ref": "user.json"
    },
    {
      "id": "undefined"
    },
    {
      "id": "number"
    }
  ]
}
```

Result: `{ "id": "undefined", ... }`

<!-- Consider adding $partial at the same level as $omit -->

## Literals escaping

Whenever there is a need to use a literal string value or key instead of a reserved keyword, prepend it with the `$literal:` prefix:

```json
{
  "$literal:$record": "boolean"
}
```

This validates an object with the `$record` key having a boolean value, e.g.:

```json
{
  "$record": true
}
```

Similarly, you can escape primitive types like `"string"`:

```json
{
  "foo": "$literal:string"
}
```

## Extensions

The vocabulary can be extended with other `$`-prefixed object keys or using type suffixes.
See available [extensions](./extensions.md).

## Credits

Thanks to [JSON Schema](https://json-schema.org/) for inspiration to use JSON-like syntax for type definitions,
and to [TypeScript](https://www.typescriptlang.org/) for inspiring good type design.
