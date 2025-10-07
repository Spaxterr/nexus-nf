import { type Msg, type NatsConnection, NatsError, type Service, type ServiceClient, type ServiceGroup } from 'nats';
import { type EndpointEntry, type NexusController } from './decorators';
import { DuplicateControllerError } from './errors';
import { ZodError } from 'zod';
import winston from 'winston';
import chalk from 'chalk';
import util from 'util';
import { type ControllerBase } from './controller';

/**
 * Represents an error response returned by the NexusNF service when request processing fails or an exception is thrown.
 *
 * @example Validation error response
 * ```json
 * {
 *  "error": true,
 *  "message": "Bad Request: Validation failed.",
 *  "code": "400",
 *  "details": [{ "path": ["email"], "message": "Invalid email format" }]
 * }
 * ```
 */
export interface ErrorResponse {
    /** Always `true` for error responses */
    error: true;
    /** Human-readable error message */
    message: string;
    /** Error code (optional, defaults to "500") */
    code?: string;
    /** Additional error details such as stacktraces (only in dev mode) or validation information*/
    details?: unknown;
}

/**
 * Represents a successful response returned by a NexusNF endpoint.
 *
 * @template T The type of the response data
 *
 * @example Successful sign-up response
 * ```json
 * {
 *  "error": false,
 *  "data": { "id": 5007, "name": "John Doe", "email": "john@example.com" }
 * }
 * ```
 */
export interface SuccessResponse<T = any> {
    /** Always `false` for successful responses */
    error: boolean;
    /** The response payload data */
    data: T;
}

/**
 * Main application class for NexusNF service.
 *
 * @example Basic setup
 * ```typescript
 * import { connect } from 'nats';
 * import { NexusApp } from './nexus-app';
 *
 * const nc = await connect({ servers: 'nats://localhost:4222' });
 * const service = await nc.services.add({
 *   name: 'user-service',
 *   version: '1.0.0',
 *   description: 'User management service'
 * });
 *
 * const app = new NexusApp(nc, service);
 * app.registerController(new UserController());
 * ```
 */
export class NexusApp {
    /** The underlying NATS connection */
    public readonly natsConnection: NatsConnection;
    /** The NATS service instance */
    public readonly service: Service;
    /** Service client for communicating with NATS services */
    public readonly client: ServiceClient;
    private readonly groups: Map<string, ServiceGroup>;
    private readonly registeredControllers: Set<ObjectConstructor>;
    private readonly isDev: boolean;
    private readonly logger: winston.Logger;

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
        this.logger = winston.createLogger({
            level: 'debug',
            format: winston.format.combine(
                winston.format.timestamp({ format: 'HH:mm:ss.SSS' }),
                winston.format.colorize(),
                winston.format.errors({ stack: true }),
                winston.format.printf(info => {
                    const { timestamp, level, message, meta } = info;
                    let result = `${chalk.gray(timestamp)} [${level}]: ${message}`;
                    if (Object.keys(meta ?? {}).length > 0) {
                        result += `\n${util.inspect(meta, { colors: true, depth: null, compact: false })}`;
                    }
                    return result;
                })
            ),
            transports: [new winston.transports.Console()],
        });

        this.logStartupInfo();
    }

    /** Gracefully stops the NATS connection and service */
    public async shutdown(): Promise<void> {
        this.logger.info('Stopping NexusNF application...');
        await this.service.stop();
        await this.natsConnection.close();
    }

    /**
     * Register a controller instance with the NexusNF service, making its decorated methods available as NATS service endpoints.
     *
     * The passed `controller` must be decorated with `@Controller` and contain methods decorated with `@Endpoint`.
     * Endpoints are automatically registered under the controller's group name.
     *
     * @param controller Controller class that has been decorated by `@Controller`
     *
     * @example Register a user controller
     * ```typescript
     * @Controller('users')
     * class UserController {
     *  @Endpoint('find')
     *  findUser(data: { id: number }) {
     *    return { id: data.id, name: 'John' }
     *  }
     * }
     *
     * app.registerController(new UserController());
     * ```
     */
    public registerController<T extends ControllerBase>(controller: T) {
        if (this.registeredControllers.has(controller.constructor as ObjectConstructor)) {
            this.logger.error(chalk.red('Duplicate controller registration attempted'), {
                controllerName: controller.constructor.name,
                group: controller.group,
            });
            throw new DuplicateControllerError(`Controller ${controller.constructor.name} has already been registered`);
        }

        let group = this.groups.get(controller.group);
        if (group === undefined) {
            group = this.service.addGroup(controller.group);
            this.groups.set(controller.group, group);
        }
        this.logger.info(`Registering endpoints for group ${chalk.cyanBright(controller.group)}`);

        for (const endpoint of (controller as NexusController).endpoints) {
            group.addEndpoint(endpoint.name, {
                handler: async (err: NatsError | null, msg: Msg) => {
                    await this.wrapHandler(endpoint, err, msg);
                },
                metadata: endpoint.options.metadata ?? {},
                queue: endpoint.options.queue ?? '',
            });
            const subject = chalk.greenBright(`${controller.group}.${endpoint.name}`);
            this.logger.info(`  Registered endpoint ${subject}`);
        }

        this.registeredControllers.add(controller.constructor as ObjectConstructor);
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
        this.logger.debug(`Received message on ${chalk.cyan(msg.subject)}`);
        if (err !== null) {
            const errorResponse = this.formatErrorResponse(err);
            msg.respond(JSON.stringify(errorResponse));
            this.logger.debug(chalk.red(`Received message was an error, responding with error`), {
                meta: { message: JSON.stringify(errorResponse), responseTopic: msg.reply },
            });
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
            this.logger.debug(chalk.green(`Successfully processed message, responding with result`), {
                meta: { message: JSON.stringify(response), responseTopic: msg.reply },
            });
        } catch (err) {
            const errorResponse = this.formatErrorResponse(err);
            msg.respond(JSON.stringify(errorResponse));
            this.logger.debug(
                chalk.red(`An error occurred during the processing of the message, responding with error`),
                {
                    meta: { message: JSON.stringify(errorResponse), responseTopic: msg.reply },
                }
            );
        }
    }

    private logStartupInfo(): void {
        const info = this.service.info();
        const nodeInfo = {
            nodeVersion: process.version,
            platform: process.platform,
            arch: process.arch,
            memory: process.memoryUsage(),
            pid: process.pid,
        };

        this.logger.info(chalk.green('🟢 NexusNF Application Starting...'));
        this.logger.info('');
        this.logger.info(chalk.bold('Service Configuration:'));
        this.logger.info(`  Name: ${chalk.cyan(info.name)}`);
        this.logger.info(`  ID: ${chalk.cyan(info.id)}`);
        this.logger.info(`  Version: ${chalk.cyan(info.version)}`);
        this.logger.info(`  Environment: ${chalk.cyan(this.isDev ? 'development' : 'production')}`);
        this.logger.info('');
        this.logger.info(chalk.bold('NATS Connection:'));
        this.logger.info(`  Server: ${chalk.cyan(this.natsConnection.getServer())}`);
        this.logger.info('');

        this.logger.info(chalk.bold('Runtime Information:'), { meta: nodeInfo });
        this.logger.info('');
    }
}
