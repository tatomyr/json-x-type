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

Also, it's possible to make `readOnly` and `writeOnly` true at the same time, which makes no sense.
Also, it's possible to make `readOnly` or `writeOnly` false, which makes no impact but creates more options to confuse people.

One more issue with `readOnly` and `writeOnly` when we want to reuse schemas.
Let's imagine we have a component named `OrderStatus`, but in a specific place we want it to be read-only.
If we compose it with `allOf`, it's not obvious if it takes effect since `allOf` don't merge subschemas, only validates against all of them:

```yaml
schema:
  orderStatus:
    allOf:
      - $ref: '#/components/schemas/OrderStatus'
      - readOnly: true
```

Actually, in Redoc, it does render as read-only, but it's not guaranteed that all tools will interpret it the same way.
To really make it read-only, we have to make an ugly workaround (because `allOf` is not intended for this purpose) like this:

```yaml
schemas:
  Order:
    ...
    orderStatus:
      allOf:
        - $ref: '#/components/schemas/OrderStatus'
      readOnly: true
```

Since X-Type keeps type description separate from OpenAPI modifiers, it's as easy as using `$omit` alongside `$ref`:

```yaml
requestBody:
  content:
    application/json:
      x-type:
        $ref: '#/components/x-types/Order'
        $omit:
          - orderStatus
```

<!--
Or, if we use the $readonly extension:

```yaml
x-type:
  orderStatus: OrderStatus
  $readonly:
    - orderStatus
```
-->

---

### A story about `oneOf`

Consider this schema (is it allOf or oneOf?):

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

Let's consider this schema:

```yaml
schema:
  type: object
  oneOf:
    - properties:
        foo:
          type: string
    - properties:
        bar:
          type: string
```

You might expect that it allows an object with either `foo` or `bar` property, but actually no object will pass this validation, including `{"foo": "some string"}` because it will be valid against MORE THEN ONE subschema.

What you can actually do, is to change it to `anyOf`, but then any object will pass validation, including `{"foo": true}`.
The reason is that it checks the first subschema, sees that `foo` is not a string, considers it invalid, then checks the second subschema, sees that `bar` is not present (which is valid since properties are optional by default), sees that it has an additional property `foo` (which is not prohibited since any schema is open by default), and finally considers the whole object valid. Which is most likely not what you want.

To actually enforce the correct behaviour, it should look like this:

```yaml
schema:
  type: object
  oneOf: # or anyOf, now it doesn't matter
    - properties:
        foo:
          type: string
      required:
        - foo # should be explicitly required
      additionalProperties: false # should be explicitly closed
    - properties:
        bar:
          type: string
      required:
        - bar
      additionalProperties: false
```

Let's agree, this is not the most intuitive way to express such a simple requirement.
In X-Type, it would look just like this:

```yaml
x-type:
  - foo: string
  - bar: string
```

Boom. That's it.

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
    - properties: # this might be a reference
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
        foo: # overlapping property
          type: string
        bar:
          type: boolean
    - type: object
      properties:
        foo: # overlapping property
          type: string
        baz:
          type: number
```

This is invalid, you have to use `anyOf` instead.
So you have to figure out the composition keyword based on the data shapes which is weird.
(It's better to be shape-unaware. It actually doesn't matter for the validation -- if the data contains `foo` as a string, it's just a valid data.)

Whilst in X-Type, it's just a matter of composition.

```yaml
x-type:
  - foo: string
    bar: boolean
  - foo: string
    baz: number
```

(`oneOf` vs `anyOf` confusion)

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

The same in X-Type looks much more readable:

```yaml
x-type:
  items:
    $array:
      $ref: '#/components/x-types/Item'
```

All keys in X-Type start with `$` prefix, so it's generally easier to distinguish them from the type values.

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
In X-Type it's just a matter of composition:

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

## X-Type issues

How to compose and object type and a record?

In TS, `{ az: string } & Record<string, number>` produces an error since `az` must be a string and a number simultaneously.

How it reflects in X-Type?..

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
