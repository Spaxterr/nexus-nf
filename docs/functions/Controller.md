[**Nexus NF v0.4.1**](../README.md)

***

[Nexus NF](../globals.md) / Controller

# Function: Controller()

> **Controller**(`name`, `options?`): \<`T`\>(`constructor`) => \{(...`args`): `(Anonymous class)`\<`T`\>; `prototype`: `(Anonymous class)`\<`any`\>; \} & `T`

Defined in: [decorators.ts:137](https://github.com/Spaxterr/nexus-nf/blob/8db83c67234287cb454464be694d5e1c6647ab41/src/core/decorators.ts#L137)

Class decorator that creates a NATS microservice controller representing
a group of related endpoints.

## Parameters

### name

`string`

Name of the controller/endpoint group

### options?

[`ControllerOptions`](../interfaces/ControllerOptions.md)

Optional configuration for the controller

## Returns

Class decorator function

> \<`T`\>(`constructor`): \{(...`args`): `(Anonymous class)`\<`T`\>; `prototype`: `(Anonymous class)`\<`any`\>; \} & `T`

### Type Parameters

#### T

`T` *extends* (...`args`) => `object`

### Parameters

#### constructor

`T`

### Returns

\{(...`args`): `(Anonymous class)`\<`T`\>; `prototype`: `(Anonymous class)`\<`any`\>; \} & `T`

## Examples

```typescript
@Controller('user')
export class UserController {
  @Endpoint('create')
  async createUser(userData: any) {
    // Creates endpoint: user.create
    return { id: 123, ...userData };
  }
}
```

```typescript
@Controller('payment', { queue: 'payment-processors' })
export class PaymentController {
  @Endpoint('process')
  async processPayment(paymentData: any) {
    // Creates endpoint: payment.process
    // Uses queue: payment-processors
    return { transactionId: 'txn_123' };
  }
}
```
