[**Nexus NF v0.4.1**](../README.md)

***

[Nexus NF](../globals.md) / ErrorResponse

# Interface: ErrorResponse

Defined in: [nexus-nf.ts:22](https://github.com/Spaxterr/nexus-nf/blob/8db83c67234287cb454464be694d5e1c6647ab41/src/core/nexus-nf.ts#L22)

Represents an error response returned by the NexusNF service when request processing fails or an exception is thrown.

## Example

```json
{
 "error": true,
 "message": "Bad Request: Validation failed.",
 "code": "400",
 "details": [{ "path": ["email"], "message": "Invalid email format" }]
}
```

## Properties

### error

> **error**: `true`

Defined in: [nexus-nf.ts:24](https://github.com/Spaxterr/nexus-nf/blob/8db83c67234287cb454464be694d5e1c6647ab41/src/core/nexus-nf.ts#L24)

Always `true` for error responses

***

### message

> **message**: `string`

Defined in: [nexus-nf.ts:26](https://github.com/Spaxterr/nexus-nf/blob/8db83c67234287cb454464be694d5e1c6647ab41/src/core/nexus-nf.ts#L26)

Human-readable error message

***

### code?

> `optional` **code**: `string`

Defined in: [nexus-nf.ts:28](https://github.com/Spaxterr/nexus-nf/blob/8db83c67234287cb454464be694d5e1c6647ab41/src/core/nexus-nf.ts#L28)

Error code (optional, defaults to "500")

***

### details?

> `optional` **details**: `unknown`

Defined in: [nexus-nf.ts:30](https://github.com/Spaxterr/nexus-nf/blob/8db83c67234287cb454464be694d5e1c6647ab41/src/core/nexus-nf.ts#L30)

Additional error details such as stacktraces (only in dev mode) or validation information
