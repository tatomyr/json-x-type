# JSON X-Type

**JSON X-Type** is a data type format for describing JSON-like structures in a simple and natural way.
Any [valid JSON](https://www.json.org/) can be validated against a **JSON X-Type** definition.

**JSON X-Type** can be described by itself ([🔗](./x-types.yaml)).

## Primitive types

| Keyword   | Description                                                         |
| --------- | ------------------------------------------------------------------- |
| string    | String type.                                                        |
| number    | Number type.                                                        |
| boolean   | Boolean type.                                                       |
| `null`    | The `null` value. (Note: The string "null" has no special meaning.) |
| undefined | Indicates that the value is not set.                                |
| any       | Any value (not validated).                                          |

## Structural keywords

| Keyword                       | Description                                  |
| ----------------------------- | -------------------------------------------- |
| $record ([🔗](#records))      | Record type for dynamic object properties.   |
| $array ([🔗](#array-types))   | Array type for collections.                  |
| $and ([🔗](#types-combining)) | Represents the combination of array members. |
| $ref ([🔗](#references))      | Reference to another **JSON X-Type**.        |

The list can be extended with other `$`-prefixed keywords.
So it's necessary to escape any custom keys that start with `$` using the `$literal` prefix ([🔗](#literals-escaping)).

## Objects

Object literals define object-like schemas:

```json
{
  "name": "string",
  "age": "number"
}
```

The example above defines an object with two required properties.

## Records

Record types allow you to define objects with dynamic properties using the `$record` keyword:

```json
{
  "$record": "boolean"
}
```

This defines an object where any property has a boolean value.

A TypeScript analogy for `$record` is `Record<string, T>`.

You can also combine specific properties with dynamic ones, although it's not recommended:

```json
{
  "name": "string",
  "$record": "any"
}
```

This defines an object with a required `name` property of type string, plus any number of additional properties of any type.
The `$record` key puts constraints on all properties, including defined ones.

<!-- TODO: consider validating tuples as objects with integer-like keys, e.g.:

```json
{
  "$0": "number",
  "$1": "number"
}
```
-->

## Array types

Array types define collections using the `$array` keyword:

```json
{
  "$array": "string"
}
```

This defines an array of strings.

A TypeScript analogy for `$array` is `Array<T>` or `T[]`.

## Union types

Array literals define multiple options, one of which is applicable (`OR` types):

```json
["string", "undefined"]
```

This defines a value that can be either a string or undefined.
Note that this is different from array types (see [Array Types](#array-types)).

The equivalent TypeScript notation uses the pipe (`|`) operator to express unions.

## Types combining

It is possible to combine several types into one using the `$and` keyword (`AND` types):

```json
{
  "$and": [{"foo": "string"}, {"bar": "number"}]
}
```

The result is an object that includes all of the properties of all the items:

```json
{
  "foo": "string",
  "bar": "number"
}
```

A TypeScript analogy of the `$and` operator is the following:

```ts
type And<U> = (U extends any ? (k: U) => void : never) extends (
  k: infer I
) => void
  ? I
  : never

type Combined = And<{foo: string} | {bar: number}> // {"foo": "string"} & {"bar": "number"} ≡ {"foo": "string", "bar": "number"}
```

Effectively, it applies the `AND` relation between the array members, replacing the `OR` relation.

Note that it doesn't make sense to combine primitive types or objects that have common properties with different types:

```json
{
  "$and": [{"foo": "string"}, {"foo": "number"}]
}
```

The above example results in `foo` being both `string` and `number`, which is effectively equivalent to TypeScript's `never` type.

Impossible combinations should result in the `undefined` type.

## Literals escaping

Whenever there is a need to use a literal string value instead of a reserved keyword, it must be prepended with the `$literal:` prefix:

```json
{
  "$literal:$record": "boolean"
}
```

This checks for an object with the `$record` key of a `boolean` value, e.g.:

```json
{
  "$record": true
}
```

Similarly, you can escape type values like `'string'`:

```json
{
  "foo": "$literal:string"
}
```

## References

It is possible to refer to other **JSON X-Types** using the [JSON Pointer](https://datatracker.ietf.org/doc/html/rfc6901) syntax:

```json
{
  "foo": {"$ref": "#/bar"},
  "bar": ["string", "number", "boolean"]
}
```

A reference must be resolved relative to the file it appears in.
The `$ref` expression must be replaced with the value of the field it refers to.
Any other properties alongside the `$ref` must be ignored.

Alternatively, the `$ref` keyword can be used as a prefix, which is easier to write and read (although the support depends on the tooling):

```json
{
  "foo": "$ref:./path/to/file"
}
```

If a reference cannot be resolved, it should be treated as `any`.

## Types extending

Possible extensions are described [here](./extensions.md).
