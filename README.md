# Nexus NF

Nexus NF or Nexus NATS Framework is a lightweight and easy-to-use framework for
building NATS microservices using TypeScript. Nexus utilizes NATS's built-in
[service API](https://docs.nats.io/using-nats/developer/services) to register
services, endpoint groups and endpoints.

> ⚠️ **Early Development**: NexusNF is currently in very early stages of
> development. Expect changes, missing features and bugs. Please report issues
> on [GitHub](https://github.com/Spaxterr/nexus-nf/issues/new).

## Features

- **Easy to use**: NexusNF focuses on simplicity and unopinionated approaches.
  Although terminology like "Controllers" are used, the framework does not force
  you to use a specific approach or design.
- **TypeScript Support**: Full type-safety included.
- **Flexible Modules**: Supports both ESM and CommonJS.
- **NATS Service Integration**: Uses NATS's service discovery and
  request-response patterns.

## Installation

```bash
npm install nexus-nf nats
```

**Required! Enable TypeScript Decorators**

```jsonc
// tsconfig.json
{
    "compilerOptions": {
        // ...
        "experimentalDecorators": true,
        "emitDecoratorMetadata": true,
    },
}
```

## Implementation

**Basic Example**

```typescript
// index.ts
import { connect } from 'nats';
import { Controller, Endpoint, NexusApp } from 'nexus-nf';

interface MathMessage {
    firstNumber: number;
    secondNumber: number;
}

@Controller('math')
class MathController {
    @Endpoint('add')
    async add(message: MathMessage) {
        return message.firstNumber + message.secondNumber;
    }

    @Endpoint('multiply')
    async multiply(message: MathMessage) {
        return message.firstNumber * message.secondNumber;
    }
}

// Connect to NATS and register the service
const nc = await connect();
const service = await nc.services.add({
    name: 'example-service',
    version: '1.0.0',
});

const app = new NexusApp(nc, service);

// Register the controller class
app.registerController(new MathController());
```

**Requesting the declared endpoint**

```bash
nats request "math.add" '{"firstNumber": 10, "secondNumber": 15}'
# {"error":false,"data":25}

nats request "math.multiply" '{"firstNumber": 6, "secondNumber": 10}'
# {"error":false,"data":60}
```

**Error Handling** Errors thrown from endpoint handlers are automatically
transformed into an error response.

```typescript
@Controller('example') {
    @Endpoint('error')
    async exampleError() {
        throw new NatsError('This is an example error', '500');
    }
}
```

```bash
nats request "example.error" "{\"firstNumber\": 10, \"secondNumber\": 15}"
# {"error":true,"message":"This is an example error","code":"500"}
```

## Contribution Guide

- Fork the repository
- Create a feature branch: `git checkout -b feature/new-feature-suggestion`
- Perform and commit your changes
- Push to the branch
- Open a [pull request](https://github.com/Spaxterr/nexus-nf/pulls)

## Links

- [NPM Package](https://www.npmjs.com/package/nexus-nf)
- [GitHub Repository](https://github.com/Spaxterr/nexus-nf)
