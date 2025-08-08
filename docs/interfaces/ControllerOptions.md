[**Nexus NF v0.4.0**](../README.md)

***

[Nexus NF](../globals.md) / ControllerOptions

# Interface: ControllerOptions

Defined in: [decorators.ts:77](https://github.com/Spaxterr/nexus-nf/blob/dfa6d0a2b203d7b6864a5a6e5f2af2f3151f865d/src/core/decorators.ts#L77)

Configuration options for the [Controller](../functions/Controller.md) decorator.

## Properties

### queue?

> `optional` **queue**: `string`

Defined in: [decorators.ts:98](https://github.com/Spaxterr/nexus-nf/blob/dfa6d0a2b203d7b6864a5a6e5f2af2f3151f865d/src/core/decorators.ts#L98)

Defines the default queue group for all endpoints in this controller.
Queue groups enable load balancing - only one member of a queue group
will receive each message.

#### See

[NATS Queue Groups Documentation](https://docs.nats.io/nats-concepts/core-nats/queue)

#### Example

```typescript
// All endpoints in this controller will use 'math-workers' queue
@Controller('math', { queue: 'math-workers' })
export class MathController {
  // This creates subject 'math.add' with queue 'math-workers'
  @Endpoint('add')
  async add(data: { a: number; b: number }) {
    return { result: data.a + data.b };
  }
}
```
