# Nexus NF

Nexus NF or Nexus NATS Framework is a lightweight and easy-to-use framework for
building NATS microservices using TypeScript. Nexus utilizes NATS's built-in
service module to register services, endpoint groups and endpoints.

```typescript
import { Controller, Endpoint, NexusApp } from 'nexus-nf';
import { connect } from 'nats';

@Controller('math')
class Math {
    @Endpoint('add')
    async add(message: { firstNumber: number; secondNumber: number }) {
        return firstNumber + secondNumber;
    }
}

const nc = await connect();
const service = await nc.services.add({
    name: 'example-service',
    version: '1.0.0',
});

const app = new NexusApp(nc, service);

app.registerController(new Math());
```
