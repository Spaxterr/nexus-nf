[**Nexus NF v0.4.1**](../README.md)

***

[Nexus NF](../globals.md) / EndpointHandler

# Type Alias: EndpointHandler()

> **EndpointHandler** = (`data`, `headers?`) => `Promise`\<`any`\> \| `any`

Defined in: [decorators.ts:21](https://github.com/Spaxterr/nexus-nf/blob/8db83c67234287cb454464be694d5e1c6647ab41/src/core/decorators.ts#L21)

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
