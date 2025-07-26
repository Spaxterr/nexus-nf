import { type Msg, type NatsConnection, NatsError, type Service, type ServiceClient, type ServiceGroup } from 'nats';
import { CONTROLLER_MARKER, type EndpointEntry, type NexusController } from './decorators';
import { DuplicateControllerError, InvalidControllerError } from './errors';
import { ZodError } from 'zod';

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
    private readonly registeredControllers: Set<ObjectConstructor>;
    private readonly isDev: boolean;

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
        this.isDev = process.env?.['NODE_ENV'] === 'dev';
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

        for (const endpoint of (controller as NexusController).endpoints) {
            group.addEndpoint(endpoint.name, {
                handler: async (err: NatsError | null, msg: Msg) => {
                    await this.wrapHandler(endpoint, err, msg);
                },
                metadata: endpoint.options.metadata ?? {},
                queue: endpoint.options.queue ?? '',
            });
        }

        this.registeredControllers.add(controller.constructor);
    }

    private async parseMessageData(endpoint: EndpointEntry, msg: Msg): Promise<unknown> {
        let data;
        const asBytes = endpoint.options?.asBytes ?? false;
        try {
            data = asBytes ? msg.data : msg.json();
        } catch (err) {
            if (err instanceof NatsError || err instanceof SyntaxError) {
                // NatsError or SyntaxError is thrown when message can not be converted/parsed
                data = msg.string();
            } else {
                throw err;
            }
        }

        if (endpoint.options?.schema) {
            return await endpoint.options.schema.parseAsync(data);
        }

        return data;
    }

    private formatErrorResponse(err: unknown): ErrorResponse {
        if (err instanceof ZodError) {
            return {
                error: true,
                code: '400',
                message: 'Bad Request: Validation failed.',
                details: err.issues,
            };
        }

        if (err instanceof NatsError) {
            return {
                error: true,
                code: err.code ?? '500',
                message: err.message,
                details: this.isDev ? { name: err.name, stack: err.stack } : undefined,
            };
        }

        if (err instanceof Error) {
            return {
                error: true,
                code: '500',
                message: 'Internal Server Error',
                details: this.isDev ? { name: err.name, message: err.message, stack: err.stack } : undefined,
            };
        }

        // Fallback for non-Error types being thrown
        return {
            error: true,
            code: '500',
            message: 'An unknown internal error occurred.',
            details: this.isDev ? String(err) : undefined,
        };
    }

    private async wrapHandler(endpoint: EndpointEntry, err: NatsError | null, msg: Msg): Promise<void> {
        if (err !== null) {
            const errorResponse = this.formatErrorResponse(err);
            msg.respond(JSON.stringify(errorResponse));
            return;
        }

        try {
            const data = await this.parseMessageData(endpoint, msg);
            this.logger.debug(`Parsed message data`, { meta: { result: data } });
            const returnValue = endpoint.handler(data, msg.headers);
            const result = returnValue instanceof Promise ? await endpoint.handler(data, msg.headers) : returnValue;

            const response: SuccessResponse = {
                error: false,
                data: result,
            };

            msg.respond(JSON.stringify(response));
        } catch (err) {
            const errorResponse = this.formatErrorResponse(err);
            msg.respond(JSON.stringify(errorResponse));
        }
    }
}
