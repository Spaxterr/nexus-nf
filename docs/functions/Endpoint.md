[**Nexus NF v0.4.0**](../README.md)

***

[Nexus NF](../globals.md) / Endpoint

# Function: Endpoint()

> **Endpoint**(`name`, `options?`): (`target`, `_`, `descriptor`) => `void`

Defined in: [decorators.ts:225](https://github.com/Spaxterr/nexus-nf/blob/dfa6d0a2b203d7b6864a5a6e5f2af2f3151f865d/src/core/decorators.ts#L225)

Method decorator that creates a NATS endpoint within a controller.
The full subject name will be `{controller.group}.{endpoint.name}`.

## Parameters

### name

`string`

Name of the endpoint (combined with controller group)

### options?

`EndpointEntryOptions`

Optional endpoint configuration

## Returns

Method decorator function

> (`target`, `_`, `descriptor`): `void`

### Parameters

#### target

`any`

#### \_

`string`

#### descriptor

`PropertyDescriptor`

### Returns

`void`

## Examples

```typescript
@Controller('math')
export class MathController {
  @Endpoint('add')
  async add(data: { a: number; b: number }) {
    // Endpoint subject: math.add
    return { result: data.a + data.b };
  }
}
```

```typescript
import { z } from 'zod';

const addSchema = z.object({
  a: z.number(),
  b: z.number()
});

type AddPayload = z.output<typeof MathSchema>;

@Controller('math')
export class MathController {
  @Endpoint('add', { schema: addSchema })
  async add(data: AddPayload) {
    // Data is validated before reaching this handler
    return { result: data.a + data.b };
  }
}
```

```typescript
@Controller('file')
export class FileController {
  @Endpoint('process', { asBytes: true })
  async processFile(data: Uint8Array) {
    // Handle raw binary data
    return { size: data.length };
  }
}
```
