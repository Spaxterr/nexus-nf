import { type MsgHdrs, type EndpointOptions as NatsEndpointOptions } from 'nats';
import { type ZodType } from 'zod';

export type EndpointHandler = (data: any, headers?: MsgHdrs) => Promise<any>;

export interface EndpointOptions extends Omit<NatsEndpointOptions, 'handler'> {
    schema?: ZodType;
    asBytes?: boolean;
}

export interface EndpointEntry {
    name: string;
    handler: EndpointHandler;
    options: EndpointOptions;
}

export const CONTROLLER_MARKER = Symbol('nexus-controller');

export interface NexusController {
    group: string;
    queue?: string | undefined;
    endpoints: EndpointEntry[];
}

/**
 * Options that can be passed to a controller decorator.
 *
 * @property queue NATS queue
 */
export interface ControllerOptions {
    queue?: string;
}

/**
 * Create a new controller, representing an endpoint group for a NATS microservice.
 *
 * @param name Name of controller / endpoint group.
 * @param options Optional controller options.
 * @example
 * ```typescript
 * // Creates a "math" endpoint group with queue `math-queue`
 * \@Controller('math', { queue: 'math-queue' })
 * export class MathController {
 *    ...
 * }
 * ```
 */
export function Controller(name: string, options?: ControllerOptions) {
    return function <T extends { new (...args: any[]): {} }>(constructor: T) {
        (constructor as any)[CONTROLLER_MARKER] = true;

        return class extends constructor implements NexusController {
            public readonly group: string = name;
            public readonly queue?: string | undefined;
            public readonly endpoints: EndpointEntry[] = [];

            constructor(...args: any[]) {
                super(...args);
                this.group = name;
                this.queue = options?.queue;

                // Extract endpoints from constructor data added by `@Endpoint`.
                const endpoints: EndpointEntry[] = (constructor as any).__endpoints__ ?? [];
                for (const endpoint of endpoints) {
                    this.endpoints.push(endpoint);
                }

                // Freeze endpoints to prevent mutations after construction.
                Object.freeze(this.endpoints);
            }
        };
    };
}

/**
 * Create a new endpoint on a controller class. The endpoint will be added to the group name passed to the constructor of the controller class.
 *
 * @param name Name of the endpoint.
 * @param options Endpoint options.
 * @example
 * ```typescript
 * \@Controller('math')
 * export class MathController {
 *    // Creates a "math.add" endpoint
 *    \@Endpoint('add')
 *    public async add(message) {
 *       // ...
 *    }
 * }
 * ```
 */
export function Endpoint(name: string, options?: Omit<EndpointOptions, 'subject'>) {
    return function (target: any, _: string, descriptor: PropertyDescriptor) {
        target.constructor.__endpoints__ ??= [];
        target.constructor.__endpoints__.push({
            handler: descriptor.value,
            name,
            options: {
                ...(options ?? {}),
            },
        } satisfies EndpointEntry);
    };
}
