import { type EndpointEntry } from './decorators';

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
 * Configuration options for the {@link Controller} decorator.
 *
 * @public
 */
export interface ControllerOptions {
    /**
     * Defines the default queue group for all endpoints in this controller.
     * Queue groups enable load balancing - only one member of a queue group
     * will receive each message.
     *
     * @see {@link https://docs.nats.io/nats-concepts/core-nats/queue | NATS Queue Groups Documentation}
     *
     * @example
     * ```typescript
     * // All endpoints in this controller will use 'math-workers' queue
     * @Controller('math', { queue: 'math-workers' })
     * export class MathController {
     *   // This creates subject 'math.add' with queue 'math-workers'
     *   @Endpoint('add')
     *   async add(data: { a: number; b: number }) {
     *     return { result: data.a + data.b };
     *   }
     * }
     * ```
     */
    queue?: string;
}

/**
 * Abstract class that defines a NexusNF controller.
 *
 * @param name Name of the controller/endpoint group
 * @param options Optional configuration for the controller
 *
 * @returns Class decorator function
 *
 * @example Basic controller
 * ```typescript
 * @Controller('user')
 * export class UserController {
 *   @Endpoint('create')
 *   async createUser(userData: any) {
 *     // Creates endpoint: user.create
 *     return { id: 123, ...userData };
 *   }
 * }
 * ```
 *
 * @example Controller with queue group
 * ```typescript
 * @Controller('payment', { queue: 'payment-processors' })
 * export class PaymentController {
 *   @Endpoint('process')
 *   async processPayment(paymentData: any) {
 *     // Creates endpoint: payment.process
 *     // Uses queue: payment-processors
 *     return { transactionId: 'txn_123' };
 *   }
 * }
 * ```
 *
 * @public @abstract
 */
export abstract class ControllerBase implements NexusController {
    public readonly options: ControllerOptions;
    public readonly queue?: string | undefined;

    public readonly endpoints: EndpointEntry[];
    public group: string = '';

    constructor(group: string, options: ControllerOptions = {}) {
        // __endpoints__ are created by @Endpoint decorators
        this.endpoints = (this.constructor as any).__endpoints__ ?? [];
        this.group = group;
        this.options = options;
        this.queue = options.queue;
    }
}
