[**Nexus NF v0.4.1**](../README.md)

***

[Nexus NF](../globals.md) / SuccessResponse

# Interface: SuccessResponse\<T\>

Defined in: [nexus-nf.ts:46](https://github.com/Spaxterr/nexus-nf/blob/8db83c67234287cb454464be694d5e1c6647ab41/src/core/nexus-nf.ts#L46)

Represents a successful response returned by a NexusNF endpoint.

## Example

```json
{
 "error": false,
 "data": { "id": 5007, "name": "John Doe", "email": "john@example.com" }
}
```

## Type Parameters

### T

`T` = `any`

The type of the response data

## Properties

### error

> **error**: `boolean`

Defined in: [nexus-nf.ts:48](https://github.com/Spaxterr/nexus-nf/blob/8db83c67234287cb454464be694d5e1c6647ab41/src/core/nexus-nf.ts#L48)

Always `false` for successful responses

***

### data

> **data**: `T`

Defined in: [nexus-nf.ts:50](https://github.com/Spaxterr/nexus-nf/blob/8db83c67234287cb454464be694d5e1c6647ab41/src/core/nexus-nf.ts#L50)

The response payload data
