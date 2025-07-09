# Nexus NF

Nexus NF or Nexus NATS Framework is a lightweight and easy-to-use framework for
building NATS microservices using TypeScript. Nexus utilizes NATS's built-in
[service API](https://docs.nats.io/using-nats/developer/services) to register
services, endpoint groups and endpoints.

> Notice! NexusNF is currently in very early stages of development. Many
> features are yet to be implemented and bugs are to be expected. Feel free to
> open bug reports using the issues tab on GitHub.

## Features

- **Easy to use**: NexusNF focuses on simplicity and unopinionated approaches.
  Although terminology like "Controllers" are used, the framework does not force
  you to use a specific approach or design.
- **TypeScript Support**: Full type-safety included.
- **Modules**: Supports both ESM and CommonJS.

## Installation

```bash
npm install nexus-nf nats
```

**Required! Enable TypeScript Decorators**

```jsonc
// tsconfig.json
{
    ...
    "experimentalDecorators": true,
    "emitDecoratorMetadata": true
}
```

## Quick Start

**Implementation**

```typescript
// index.ts
import { connect } from 'nats';
import { Controller, Endpoint, NexusApp } from 'nexus-nf';

@Controller('math')
class Math {
    // Creates a `math.add` endpoint
    @Endpoint('add')
    async add(message: { firstNumber: number; secondNumber: number }) {
        return message.firstNumber + message.secondNumber;
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
app.registerController(new Math());
```

Requesting the previous endpoint works as usual

```bash
nats request "math.add" "{\"firstNumber\": 10, \"secondNumber\": 15}"
# {"error":false,"data":25}
```
