/* eslint @typescript-eslint/explicit-member-accessibility: 0 */
import { z } from 'zod';
import {
    Controller,
    CONTROLLER_MARKER,
    Endpoint,
    type EndpointOptions,
    type NexusController,
} from '../../core/decorators';

describe('NexusNF Decorators', () => {
    describe('@Controller', () => {
        it('should mark a class with the controller marker', () => {
            @Controller('test')
            class TestController {}

            expect((TestController as any)[CONTROLLER_MARKER]).toBe(true);
        });

        it('should create a controller with the correct group name', () => {
            @Controller('user')
            class UserController {}

            const instance = new UserController() as NexusController;
            expect(instance.group).toBe('user');
        });

        it('should create a controller without queue when not specified', () => {
            @Controller('test')
            class TestController {}

            const instance = new TestController() as NexusController;
            expect(instance.queue).toBeUndefined();
        });

        it('should create a controller with queue when specified', () => {
            @Controller('payment', { queue: 'payment-workers' })
            class PaymentController {}

            const instance = new PaymentController() as NexusController;
            expect(instance.group).toBe('payment');
            expect(instance.queue).toBe('payment-workers');
        });

        it('should initialize endpoints array', () => {
            @Controller('test')
            class TestController {}

            const instance = new TestController() as NexusController;
            expect(instance.endpoints).toEqual([]);
        });

        it('should freeze the endpoints array', () => {
            @Controller('test')
            class TestController {}

            const instance = new TestController() as NexusController;
            expect(Object.isFrozen(instance.endpoints)).toBe(true);
        });

        it('should preserve constructor parameters', () => {
            @Controller('test')
            class TestController {
                constructor(public value: string) {}
            }

            const instance = new TestController('hello') as TestController & NexusController;
            expect(instance.value).toBe('hello');
            expect(instance.group).toBe('test');
        });

        it('should preserve class methods', () => {
            @Controller('test')
            class TestController {
                public getValue(): string {
                    return 'test-value';
                }
            }

            const instance = new TestController() as TestController & NexusController;
            expect(instance.getValue()).toBe('test-value');
        });

        it('should work with inheritance', () => {
            class BaseController {
                public baseMethod(): string {
                    return 'base';
                }
            }

            @Controller('derived')
            class DerivedController extends BaseController {
                public derivedMethod(): string {
                    return 'derived';
                }
            }

            const instance = new DerivedController() as DerivedController & NexusController;
            expect(instance.group).toBe('derived');
            expect(instance.baseMethod()).toBe('base');
            expect(instance.derivedMethod()).toBe('derived');
        });
    });

    describe('@Endpoint', () => {
        it('should add endpoint metadata to the constructor', () => {
            class TestController {
                @Endpoint('test')
                public testMethod() {
                    return { success: true };
                }
            }

            const endpoints = (TestController as any).__endpoints__;
            expect(endpoints).toHaveLength(1);
            expect(endpoints[0]).toMatchObject({
                name: 'test',
                handler: expect.any(Function),
                options: {},
            });
        });

        it('should handle multiple endpoints', () => {
            class TestController {
                @Endpoint('first')
                firstMethod() {
                    return { data: 'first' };
                }

                @Endpoint('second')
                secondMethod() {
                    return { data: 'second' };
                }
            }

            const endpoints = (TestController as any).__endpoints__;
            expect(endpoints).toHaveLength(2);
            expect(endpoints[0].name).toBe('first');
            expect(endpoints[1].name).toBe('second');
        });

        it('should preserve endpoint options', () => {
            const testSchema = z.object({ test: z.string() });
            const options: EndpointOptions = {
                schema: testSchema,
                asBytes: true,
                queue: 'test-queue',
                metadata: { version: '1.0' },
            };

            class TestController {
                @Endpoint('test', options)
                testMethod() {
                    return { success: true };
                }
            }

            const endpoints = (TestController as any).__endpoints__;
            expect(endpoints[0].options).toMatchObject({
                schema: testSchema,
                asBytes: true,
                queue: 'test-queue',
                metadata: { version: '1.0' },
            });
        });

        it('should work with no options', () => {
            class TestController {
                @Endpoint('simple')
                simpleMethod() {
                    return { data: 'simple' };
                }
            }

            const endpoints = (TestController as any).__endpoints__;
            expect(endpoints[0].options).toEqual({});
        });

        it('should preserve the original method functionality', async () => {
            class TestController {
                @Endpoint('calculate')
                async calculate(data: { a: number; b: number }): Promise<any> {
                    return await Promise.resolve({ result: data.a + data.b });
                }
            }

            const instance = new TestController();
            const result = await instance.calculate({ a: 5, b: 3 });
            expect(result).toEqual({ result: 8 });
        });

        it('should handle async and non-async methods', async () => {
            class TestController {
                @Endpoint('async')
                async asyncMethod() {
                    return await Promise.resolve({ type: 'async' });
                }

                @Endpoint('sync')
                syncMethod() {
                    return { type: 'sync' };
                }
            }

            const instance = new TestController();
            const asyncResult = await instance.asyncMethod();
            const syncResult = instance.syncMethod();

            expect(asyncResult).toEqual({ type: 'async' });
            expect(syncResult).toEqual({ type: 'sync' });
        });
    });

    describe('@Controller and @Endpoint integration', () => {
        it('should combine controller and endpoint decorators correctly', () => {
            @Controller('integration', { queue: 'integration-workers' })
            class IntegrationController {
                @Endpoint('test', { asBytes: true })
                testEndpoint(data: Uint8Array) {
                    return { size: data.length };
                }

                @Endpoint('another')
                anotherEndpoint() {
                    return { message: 'hello' };
                }
            }

            const instance = new IntegrationController() as IntegrationController & NexusController;

            // Check controller properties
            expect(instance.group).toBe('integration');
            expect(instance.queue).toBe('integration-workers');
            expect((IntegrationController as any)[CONTROLLER_MARKER]).toBe(true);

            // Check endpoints
            expect(instance.endpoints).toHaveLength(2);
            expect(instance.endpoints[0]).toMatchObject({
                name: 'test',
                options: { asBytes: true },
            });
            expect(instance.endpoints[1]).toMatchObject({
                name: 'another',
                options: {},
            });
        });

        it('should retain zod schemas', () => {
            const userSchema = z.object({
                name: z.string(),
                age: z.number().min(0),
            });

            @Controller('user')
            class UserController {
                @Endpoint('create', { schema: userSchema })
                createUser(data: z.infer<typeof userSchema>) {
                    return { id: 123, ...data };
                }
            }

            const instance = new UserController() as UserController & NexusController;
            const endpoint = instance.endpoints[0];

            expect(endpoint!.name).toBe('create');
            expect(endpoint!.options.schema).toBe(userSchema);
        });

        it('should handle complex endpoint configurations', () => {
            const dataSchema = z.object({
                id: z.string(),
                payload: z.unknown(),
            });

            @Controller('complex', { queue: 'complex-processors' })
            class ComplexController {
                @Endpoint('process', {
                    schema: dataSchema,
                    asBytes: false,
                    queue: 'special-queue',
                    metadata: {
                        version: '2.0',
                        description: 'Processes complex data',
                    },
                })
                processData(data: z.infer<typeof dataSchema>) {
                    return { processed: true, id: data.id };
                }
            }

            const instance = new ComplexController() as ComplexController & NexusController;
            const endpoint = instance.endpoints[0];

            expect(instance.group).toBe('complex');
            expect(instance.queue).toBe('complex-processors');
            expect(endpoint!.name).toBe('process');
            expect(endpoint!.options).toMatchObject({
                schema: dataSchema,
                asBytes: false,
                queue: 'special-queue',
                metadata: {
                    version: '2.0',
                    description: 'Processes complex data',
                },
            });
        });
    });

    describe('Error cases and edge conditions', () => {
        it('should handle empty controller name', () => {
            @Controller('')
            class EmptyNameController {}

            const instance = new EmptyNameController() as NexusController;
            expect(instance.group).toBe('');
        });

        it('should handle empty endpoint name', () => {
            class TestController {
                @Endpoint('')
                emptyEndpoint() {
                    return {};
                }
            }

            const endpoints = (TestController as any).__endpoints__;
            expect(endpoints[0].name).toBe('');
        });

        it('should not interfere with non-decorated classes', () => {
            class RegularClass {
                regularMethod() {
                    return 'regular';
                }
            }

            const instance = new RegularClass();
            expect((RegularClass as any)[CONTROLLER_MARKER]).toBeUndefined();
            expect((RegularClass as any).__endpoints__).toBeUndefined();
            expect(instance.regularMethod()).toBe('regular');
        });
    });

    describe('Metadata and reflection', () => {
        it('should preserve all endpoint metadata for framework use', () => {
            const schema = z.object({ id: z.number() });

            @Controller('metadata-test', { queue: 'test-queue' })
            class MetadataController {
                @Endpoint('rich-endpoint', {
                    schema,
                    asBytes: false,
                    queue: 'endpoint-queue',
                    metadata: {
                        rateLimit: '100',
                        auth: 'required',
                        description: 'A rich endpoint with lots of metadata',
                    },
                })
                richEndpoint(data: { id: number }) {
                    return { processed: data.id };
                }
            }

            const instance = new MetadataController() as MetadataController & NexusController;
            const endpoint = instance.endpoints[0];

            // Verify all metadata is preserved
            expect(endpoint!.name).toBe('rich-endpoint');
            expect(endpoint!.options.schema).toBe(schema);
            expect(endpoint!.options.asBytes).toBe(false);
            expect(endpoint!.options.queue).toBe('endpoint-queue');
            expect(endpoint!.options.metadata).toEqual({
                rateLimit: '100',
                auth: 'required',
                description: 'A rich endpoint with lots of metadata',
            });

            // Verify controller metadata
            expect(instance.group).toBe('metadata-test');
            expect(instance.queue).toBe('test-queue');
        });
    });
});

// Additional test utilities for mocking NATS types if needed
export const createMockHeaders = (headers: Record<string, string> = {}) => {
    const mockHeaders = new Map(Object.entries(headers));
    return mockHeaders as any; // Mock MsgHdrs type
};

export const createMockMessage = (data: any, headers?: Record<string, string>) => {
    const jsonData = JSON.stringify(data);
    return {
        data: new TextEncoder().encode(jsonData),
        json: () => data,
        string: () => jsonData,
        headers: headers ? createMockHeaders(headers) : undefined,
        subject: 'test.subject',
        reply: 'test.reply',
        respond: jest.fn(),
    };
};
