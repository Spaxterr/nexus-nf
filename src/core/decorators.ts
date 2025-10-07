import { type MsgHdrs, type EndpointOptions as NatsEndpointOptions } from 'nats';
import { type ZodType } from 'zod';
import { ControllerBase } from './controller';

/**
 * Service endpoint handler signature.
 * Must return a {@link Promise}, resolved value will be included in the response message's `data` field.
 * Throwing an error from an endpoint handler will respond to the message with an ErrorResponse.
 *
 * @param data The incoming message data, parsed from JSON, string or byte array
 * @param headers Optional NATS message headers
 * @returns Promise resolving to response data
 *
 * @example
 * ```typescript
 * @Endpoint('example')
 * async exampleHandler(data, headers) {
 *  return { hello: 'world' }
 * }
 * ```
 */
export type EndpointHandler = (data: any, headers?: MsgHdrs) => Promise<any> | any;

/**
 * Configuration options for a NATS endpoint, extends the base NATS endpoint options.
 * `handler` is omitted since the handler is set by the {@link Endpoint} decorator.
 *
 * @public
 */
export interface EndpointOptions extends Omit<NatsEndpointOptions, 'handler'> {
    /**
     * {@link ZodType} schema to use for validation of input data
     * When provided, incoming message data will be validated against this schema
     * before being passed to the handler.
     */
    schema?: ZodType;
    /**
     * If `true`, data will be processed as `Uint8Array` instead of JSON/String.
     */
    asBytes?: boolean;
}

/**
 * Internal representation of an endpoint within a controller.
 *
 * @internal
 */
export interface EndpointEntry {
    name: string;
    handler: EndpointHandler;
    options: EndpointOptions;
}

/**
 * Symbol used to mark classes as NexusNF controllers.
 *
 * @internal
 */
export const CONTROLLER_MARKER = Symbol('nexus-controller');

/**
 * Internal interface representing a fully configured NexusNF controller.
 *
 * @internal
 */
export interface NexusController {
    constructor: any;
    group: string;
    queue?: string | undefined;
    endpoints: EndpointEntry[];
}

/**
 * Endpoint options without the subject property (managed by the framework).
 */
type EndpointEntryOptions = Omit<EndpointOptions, 'subject'>;

/**
 * Method decorator that creates a NATS endpoint within a controller.
 * The full subject name will be `{controller.group}.{endpoint.name}`.
 *
 * @param name - Name of the endpoint (combined with controller group)
 * @param options - Optional endpoint configuration
 *
 * @returns Method decorator function
 *
 * @example Basic endpoint
 * ```typescript
 * @Controller('math')
 * export class MathController {
 *   @Endpoint('add')
 *   async add(data: { a: number; b: number }) {
 *     // Endpoint subject: math.add
 *     return { result: data.a + data.b };
 *   }
 * }
 * ```
 *
 * @example Endpoint with validation schema
 * ```typescript
 * import { z } from 'zod';
 *
 * const addSchema = z.object({
 *   a: z.number(),
 *   b: z.number()
 * });
 *
 * type AddPayload = z.output<typeof MathSchema>;
 *
 * export class MathController extends ControllerBase {
 *   constructor() {
 *     super('math');
 *   }
 *
 *   @Endpoint('add', { schema: addSchema })
 *   async add(data: AddPayload) {
 *     // Data is validated before reaching this handler
 *     return { result: data.a + data.b };
 *   }
 * }
 * ```
 *
 * @example Binary data endpoint
 * ```typescript
 * export class FileController extends ControllerBase {
 *   constructor() {
 *     super('files');
 *   }
 *
 *   @Endpoint('process', { asBytes: true })
 *   async processFile(data: Uint8Array) {
 *     // Handle raw binary data
 *     return { size: data.length };
 *   }
 * }
 * ```
 *
 * @public
 */
export function Endpoint(name: string, options?: EndpointEntryOptions) {
    return function (target: any, _: string, descriptor: PropertyDescriptor) {
        if (target instanceof ControllerBase) {
            (target.constructor as any).__endpoints__ ??= [];
            (target.constructor as any).__endpoints__.push({
                handler: descriptor.value,
                name,
                options: {
                    ...(options ?? {}),
                },
            } satisfies EndpointEntry);
        } else {
            throw new TypeError('@Endpoint decorator can only be used on classes that extend ControllerBase');
        }
    };
}
