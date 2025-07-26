import { type Msg, type NatsConnection, NatsError, type Service, type ServiceClient, type ServiceGroup } from 'nats';
import { CONTROLLER_MARKER, type EndpointEntry, type NexusController } from './decorators';
import { DuplicateControllerError, InvalidControllerError } from './errors';
import { ZodError } from 'zod';
import winston from 'winston';
import chalk from 'chalk';
import util from 'util';

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
     * Register a controller/endpoint group to the NexusNF app.
     *
     * @param controller Controller class that has been decorated by `@Controller`
     */
    public registerController(controller: any) {
        if (controller.constructor[CONTROLLER_MARKER] !== true) {
            this.logger.error(chalk.red('Invalid controller registration attempted'), {
                controllerName: controller.constructor.name,
                reason: 'Missing @Controller decorator',
            });
            throw new InvalidControllerError('Only classes decorated by @Controller may be registered on a Nexus app');
        }
        if (this.registeredControllers.has(controller.constructor)) {
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
