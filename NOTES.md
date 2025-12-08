# Notes

## JSON schema issues

Consider this schema:

```yaml
schema:
  type: object
  properties:
    id:
      type: string
      readOnly: true
    name:
      type: string
  required:
    - name
```

It means that we expect `id` to be present only in responses while `name` is expected in both responses and requests.
However, it means that `id` is optional in responses.
If we put `id` in the `required` section, it will require it in the requests also? (NOT SURE)

In JSON X-Type, you can't do this:

```yaml
x-type:
  $readonly:
    id:
      - string
      - undefined
    name: string
```

This will produce an error.

---

Consider this schema:

```yaml
schema:
  type: object
  allOf:
    - properties:
        foo:
          type: string
    - properties:
        bar:
          type: number
```

In order to actually do what you want, you have to write it this way (which is already strange):

```yaml
schema:
  type: object
  unevaluatedProperties: false
  allOf:
    - properties:
        foo:
          type: string
        required:
          - foo
    - properties:
        bar:
          type: number
        required:
          - bar
```

But if any of the `allOf` items happen to contain `unevaluatedProperties: false` in the root (e.g., you might want to use a reference), it won't work:

```yaml
schema:
  type: object
  unevaluatedProperties: false
  allOf:
    - type: object
      unevaluatedProperties: false
      allOf:
        - properties:
            foo:
            type: string
            required:
              - foo
        - properties:
            bar:
            type: number
            required:
              - bar
    - properties:
        baz:
        type: boolean
      required:
        - baz
```

---

It's possible to mix up things that are not allowed together, like this:

```yaml
schema:
  type: array
  properties: ...
```

---

In JSON Schema you can mix `allOf` and `oneOf` in one object, like this:

```yaml
schema:
  allOf:
    - properties: # this could be a reference
        foo:
          type: string
    - properties:
        bar:
          type: number
  oneOf:
    - required:
        - foo
    - required:
        - bar
```

This is a valid schema, but it's extremely hard to follow such compositions (you have to make mental gymnastics to figure out what is required and what is not), especially from the code perspective.

It's easier to read if you write the different options explicitly:

```yaml
x-type:
  - foo: string # again, this could be a reference
    bar:
      - number
      - undefined
  - foo:
      - string
      - undefined
    bar: number
```

This way you keep your modifiers (like required or additionalProperties) closer to the types they apply to so it's easier to follow, maintain, and reuse the types.

---

It's easy to forget to close the schema when needed.
To do so, you should always use `additionalProperties: false` or `unevaluatedProperties: false` in the schema. They also have a subtle difference, and it's not always obvious which one to use.

---

```yaml
schema:
  oneOf:
    - type: object
      properties:
        foo:
          type: string
        bar:
          type: boolean
    - type: object
      properties:
        foo:
          type: string
        baz:
          type: number
```

This is invalid, you have to use `anyOf` instead.
So you have to figure out the composition keyword based on the data shapes which is weird.
(It's better to be shape-unaware. It actually doesn't matter for the validation -- if the data contains `foo` as a string, it's just a valid data.)

Whilst in X-Types, it's just a matter of composition.

```yaml
x-type:
  - foo: string
    bar: boolean
  - foo: string
    baz: number
```

---

It's easy to get confused when composing objects/arrays with properties named like the type JSON Schema keywords, for instance:

```yaml
schema:
  type: object
  properties:
    items:
      type: array
      items:
        $ref: '#/components/schemas/Item'
  required:
    - items
```

The same in X-Types looks much more readable:

```yaml
x-type:
  items:
    $array:
      $ref: '#/components/x-types/Item'
```

All keys in X-Types start with `$` prefix, so it's generally easier to distinguish them from the type values.

---

Enums in JSON Schema come with redundancy:

```yaml
schema:
  type: string
  enum:
    - foo
    - bar
```

You can easily infer that the enum is of string type just looking at the enum options.
In X-Types it's just a matter of composition:

```yaml
x-type:
  - foo
  - bar
```

Even more, you can use literals of different types if needed:

```yaml
x-type:
  - 100
  - '100'
```

In JSON Schema, you have to write something like this:

```yaml
schema:
  type:
    - integer
    - string
  enum:
    - 100
    - '100'
```

Or this:

```yaml
schema:
  oneOf:
    - type: integer
      enum:
        - 100
    - type: string
      enum:
        - '100'
```

## X-Types issues

How to compose and object type and a record?

In TS, `{ az: string } & Record<string, number>` produces an error since `az` must be a string and a number simultaneously.

How it reflects in X-Types?..

I'd assume the following:

```yaml
x-type:
  $and:
    - az: string
    - $record: number
```

to equal

```yaml
x-type:
  az: string
  $record: number
```

to represent an object type that has `az` as a string and every other property as a number.

(BTW, check if `{$and: [{az: string}, {$record: number}]}` produces `{az: string, $record: number}`.)

As an option, we can only allow to combine objects with records of the same or a wider type, like this:

```yaml
x-type:
  $and:
    - az: string
    - $record: any # any > string
```

But if the `$and` composition leads to a merged object, then the record notation alongside another properties should be a wider type, so this should produce an error:

```yaml
x-type:
  $and:
    - az: string
    - $record: number # number !== string
```

This means we have to implement the types comparison logic.

---

Consider this type:

```yaml
x-type:
  $array:
    - string
    - undefined
```

This will lead to json containing empty items. In this case, we should treat `undefined` as `null` (as JS is doing it).
