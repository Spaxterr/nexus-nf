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

### Basic Example

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

Note that the `MathMessage` interface here is just for TypeScript hinting. For
runtime endpoint data validation see [schema validation](#schema-validation)
example.

**Requesting the declared endpoint**

```bash
nats request "math.add" '{"firstNumber": 10, "secondNumber": 15}'
# {"error":false,"data":25}

nats request "math.multiply" '{"firstNumber": 6, "secondNumber": 10}'
# {"error":false,"data":60}
```

### Error Handling

Errors thrown from endpoint handlers are automatically transformed into an error
response.

```typescript
@Controller('example')
class ExampleController {
    @Endpoint('error')
    async exampleError() {
        throw new NatsError('This is an example error', '500');
    }
}
```

```bash
nats request "example.error" ""
# {"error":true,"message":"This is an example error","code":"500"}
```

### Schema Validation

NexusNF can integrate with [Zod](https://zod.dev/) for runtime data validation
and message parsing. The provided `schema` in the `@Endpoint`'s options will be
used to validate the incoming message body.

```bash
npm install zod
```

```typescript
import * as z from 'zod';

const MathSchema = z.object({
    firstNumber: z.number(),
    secondNumber: z.number(),
});

type MathPayload = z.output<typeof MathSchema>;

@Controller('math')
class MathController {
    @Endpoint('add', { schema: MathSchema })
    async add(message: MathPayload) {
        return message.firstNumber + message.secondNumber;
    }
}
```

```bash
nats request "math.add" '{"firstNumber": 10, "secondNumber": 15}'
# {"error":false,"data":25}

nats request "math.add" '{"firstNumber": 10, "secondNumber": true}'
# {"error":true,"code":"400","message":"Bad Request: Validation failed.","details":[{"expected":"number","code":"invalid_type","path":["secondNumber"],"message":"Invalid input: expected number, received boolean"}]}
```

## Contribution Guide

- **Fork** the repository on GitHub.
- **Clone** your forked repository: `git clone <link to fork repository>
- **Create a feature branch**: `git checkout -b feature/my-awesome-feature`
- **Install dependencies**: `npm install`
- **Make your changes**.
- **Run tests**: `npm test`
- **Commit and push** your changes to your fork.
- Open a [**Pull Request**](https://github.com/Spaxterr/nexus-nf/pulls) to the
  main branch of the original repository.

## Links

- [NPM Package](https://www.npmjs.com/package/nexus-nf)
- [GitHub Repository](https://github.com/Spaxterr/nexus-nf)
- [API Documentation](https://spaxterr.github.io/nexus-nf/)
