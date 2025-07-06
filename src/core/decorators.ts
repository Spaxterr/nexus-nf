import { type EndpointOptions } from 'nats';

export type EndpointHandler = (...args: any[]) => Promise<any>;
export interface EndpointEntry extends EndpointOptions {
    handler: EndpointHandler;
}

export const CONTROLLER_MARKER = Symbol('nexus-controller');

export interface NexusController {
    group: string;
    queue?: string;
    endpoints: EndpointEntry[];
}

export interface ControllerOptions {
    queue?: string;
}

/**
 * Create a new controller, representing an endpoint group for a NATS microservice.
 *
 * @param name Name of controller / endpoint group.
 */
export function Controller(name: string, options?: ControllerOptions) {
    return function <T extends { new (...args: any[]): {} }>(constructor: T) {
        (constructor as any)[CONTROLLER_MARKER] = true;

        return class extends constructor implements NexusController {
            public readonly group: string = name;
            public readonly queue?: string;
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
 */
export function Endpoint(name: string) {
    return function (target: any, _: string, descriptor: PropertyDescriptor) {
        target.constructor.__endpoints__ ??= [];
        target.constructor.__endpoints__.push({
            subject: name,
            handler: descriptor.value,
        } satisfies EndpointEntry);
    };
}
