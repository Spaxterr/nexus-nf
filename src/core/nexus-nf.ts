import { type Msg, type NatsConnection, NatsError, type Service, type ServiceClient, type ServiceGroup } from 'nats';
import { CONTROLLER_MARKER, type EndpointHandler } from './decorators';
import { DuplicateControllerError, InvalidControllerError } from './errors';

export interface ErrorResponse {
    error: true;
    message: string;
    code?: string;
    details?: unknown;
}

export interface SuccessResponse {
    error: boolean;
    data: any;
}

/**
 * Main application class for NexusNF service.
 *
 * @example
 * ```typescript
 * const nc = await connect(...);
 * const service = await nc.services.add(...)
 * const app = new NexusApp(nc, service);
 * app.registerController(new ExampleController());
 * ```
 */
export class NexusApp {
    public readonly natsConnection: NatsConnection;
    public readonly service: Service;
    public readonly client: ServiceClient;
    private readonly groups: Map<string, ServiceGroup>;
    private readonly registeredControllers: Set<NexusController>;

    /**
     * @param natsConnection NATS connection instance
     * @param natsService NATS service instance
     */
    constructor(natsConnection: NatsConnection, natsService: Service) {
        this.natsConnection = natsConnection;
        this.service = natsService;
        this.client = natsConnection.services.client();
        this.groups = new Map();
        this.registeredControllers = new Set();
    }

    /** Gracefully stops the NATS connection and service */
    public async shutdown(): Promise<void> {
        await this.service.stop();
        await this.natsConnection.close();
    }

    /**
     * Register a controller/endpoint group to the NexusNF app.
     *
     * @param controller Controller class that has been decorated by `@Controller`
     */
    public registerController(controller: any) {
        if (controller.constructor[CONTROLLER_MARKER] !== true) {
            throw new InvalidControllerError('Only classes decorated by @Controller may be registered on a Nexus app');
        }
        if (this.registeredControllers.has(controller.constructor)) {
            throw new DuplicateControllerError(`Controller has already been registered`);
        }

        let group = this.groups.get(controller.group);
        if (group === undefined) {
            group = this.service.addGroup(controller.group);
            this.groups.set(controller.group, group);
        }

        for (const endpoint of controller.endpoints) {
            group.addEndpoint(endpoint.subject, {
                handler: async (err: NatsError | null, msg: Msg) => {
                    await this.wrapHandler(endpoint.handler, err, msg);
                },
                queue: controller.queue,
            });
        }

        this.registeredControllers.add(controller);
    }

    private async wrapHandler(handler: EndpointHandler, err: NatsError | null, msg: Msg): Promise<void> {
        if (err !== null) {
            const errorResponse: ErrorResponse = {
                error: true,
                message: err.message ?? 'NATS error occurred',
                code: err.code,
                details: err.name,
            };
            msg.respond(JSON.stringify(errorResponse));
            return;
        }

        try {
            let data: Parameters<typeof handler> | Uint8Array;
            try {
                data = msg.json<Parameters<typeof handler>>();
            } catch {
                // If message can't be parsed, fall back to raw data
                data = msg.data;
            }

            const result = await handler(data);

            const response: SuccessResponse = {
                error: false,
                data: result,
            };

            msg.respond(JSON.stringify(response));
        } catch (err) {
            const errorResponse: ErrorResponse = {
                error: true,
                message: err instanceof Error ? err.message : 'Internal server error',
                details: err instanceof Error ? err.stack : undefined,
                code: err instanceof NatsError ? err.code : '500',
            };

            msg.respond(JSON.stringify(errorResponse));
        }
    }
}
