[**Nexus NF v0.4.0**](../README.md)

***

[Nexus NF](../globals.md) / EndpointHandler

# Type Alias: EndpointHandler()

> **EndpointHandler** = (`data`, `headers?`) => `Promise`\<`any`\> \| `any`

Defined in: [decorators.ts:21](https://github.com/Spaxterr/nexus-nf/blob/dfa6d0a2b203d7b6864a5a6e5f2af2f3151f865d/src/core/decorators.ts#L21)

Service endpoint handler signature.
Must return a Promise, resolved value will be included in the response message's `data` field.
Throwing an error from an endpoint handler will respond to the message with an ErrorResponse.

## Parameters

### data

`any`

The incoming message data, parsed from JSON, string or byte array

### headers?

`MsgHdrs`

Optional NATS message headers

## Returns

`Promise`\<`any`\> \| `any`

Promise resolving to response data

## Example

```typescript
@Endpoint('example')
async exampleHandler(data, headers) {
 return { hello: 'world' }
}
```
