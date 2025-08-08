[**Nexus NF v0.4.1**](../README.md)

***

[Nexus NF](../globals.md) / NexusApp

# Class: NexusApp

Defined in: [nexus-nf.ts:72](https://github.com/Spaxterr/nexus-nf/blob/8db83c67234287cb454464be694d5e1c6647ab41/src/core/nexus-nf.ts#L72)

Main application class for NexusNF service.

## Example

```typescript
import { connect } from 'nats';
import { NexusApp } from './nexus-app';

const nc = await connect({ servers: 'nats://localhost:4222' });
const service = await nc.services.add({
  name: 'user-service',
  version: '1.0.0',
  description: 'User management service'
});

const app = new NexusApp(nc, service);
app.registerController(new UserController());
```

## Constructors

### Constructor

> **new NexusApp**(`natsConnection`, `natsService`): `NexusApp`

Defined in: [nexus-nf.ts:88](https://github.com/Spaxterr/nexus-nf/blob/8db83c67234287cb454464be694d5e1c6647ab41/src/core/nexus-nf.ts#L88)

#### Parameters

##### natsConnection

`NatsConnection`

NATS connection instance

##### natsService

`Service`

NATS service instance

#### Returns

`NexusApp`

## Properties

### natsConnection

> `readonly` **natsConnection**: `NatsConnection`

Defined in: [nexus-nf.ts:74](https://github.com/Spaxterr/nexus-nf/blob/8db83c67234287cb454464be694d5e1c6647ab41/src/core/nexus-nf.ts#L74)

The underlying NATS connection

***

### service

> `readonly` **service**: `Service`

Defined in: [nexus-nf.ts:76](https://github.com/Spaxterr/nexus-nf/blob/8db83c67234287cb454464be694d5e1c6647ab41/src/core/nexus-nf.ts#L76)

The NATS service instance

***

### client

> `readonly` **client**: `ServiceClient`

Defined in: [nexus-nf.ts:78](https://github.com/Spaxterr/nexus-nf/blob/8db83c67234287cb454464be694d5e1c6647ab41/src/core/nexus-nf.ts#L78)

Service client for communicating with NATS services

## Methods

### shutdown()

> **shutdown**(): `Promise`\<`void`\>

Defined in: [nexus-nf.ts:117](https://github.com/Spaxterr/nexus-nf/blob/8db83c67234287cb454464be694d5e1c6647ab41/src/core/nexus-nf.ts#L117)

Gracefully stops the NATS connection and service

#### Returns

`Promise`\<`void`\>

***

### registerController()

> **registerController**\<`T`\>(`controller`): `void`

Defined in: [nexus-nf.ts:144](https://github.com/Spaxterr/nexus-nf/blob/8db83c67234287cb454464be694d5e1c6647ab41/src/core/nexus-nf.ts#L144)

Register a controller instance with the NexusNF service, making its decorated methods available as NATS service endpoints.

The passed `controller` must be decorated with `@Controller` and contain methods decorated with `@Endpoint`.
Endpoints are automatically registered under the controller's group name.

#### Type Parameters

##### T

`T` *extends* `NexusController`

#### Parameters

##### controller

`T`

Controller class that has been decorated by `@Controller`

#### Returns

`void`

#### Example

```typescript
@Controller('users')
class UserController {
 @Endpoint('find')
 findUser(data: { id: number }) {
   return { id: data.id, name: 'John' }
 }
}

app.registerController(new UserController());
```
