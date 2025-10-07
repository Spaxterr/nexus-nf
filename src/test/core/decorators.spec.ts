/* eslint @typescript-eslint/explicit-member-accessibility: 0 */
import { z } from 'zod';
import { Endpoint, type EndpointOptions } from '../../core/decorators';
import { ControllerBase } from '../../core/controller';

describe('NexusNF Decorators', () => {
    describe('@Endpoint', () => {
        it('should add endpoint metadata to the constructor', () => {
            class TestController extends ControllerBase {
                @Endpoint('test')
                public testMethod() {
                    return { success: true };
                }
            }

            const endpoints = new TestController('test').endpoints;
            expect(endpoints).toHaveLength(1);
            expect(endpoints[0]).toMatchObject({
                name: 'test',
                handler: expect.any(Function),
                options: {},
            });
        });

        it('should handle multiple endpoints', () => {
            class TestController extends ControllerBase {
                @Endpoint('first')
                firstMethod() {
                    return { data: 'first' };
                }

                @Endpoint('second')
                secondMethod() {
                    return { data: 'second' };
                }
            }

            const endpoints = new TestController('test').endpoints;
            expect(endpoints).toHaveLength(2);
            expect(endpoints[0]!.name).toBe('first');
            expect(endpoints[1]!.name).toBe('second');
        });

        it('should preserve endpoint options', () => {
            const testSchema = z.object({ test: z.string() });
            const options: EndpointOptions = {
                schema: testSchema,
                asBytes: true,
                queue: 'test-queue',
                metadata: { version: '1.0' },
            };

            class TestController extends ControllerBase {
                @Endpoint('test', options)
                testMethod() {
                    return { success: true };
                }
            }

            const endpoints = new TestController('test').endpoints;
            expect(endpoints[0]!.options).toMatchObject({
                schema: testSchema,
                asBytes: true,
                queue: 'test-queue',
                metadata: { version: '1.0' },
            });
        });

        it('should work with no options', () => {
            class TestController extends ControllerBase {
                @Endpoint('simple')
                simpleMethod() {
                    return { data: 'simple' };
                }
            }

            const endpoints = new TestController('test').endpoints;
            expect(endpoints[0]!.options).toEqual({});
        });

        it('should preserve the original method functionality', async () => {
            class TestController extends ControllerBase {
                @Endpoint('calculate')
                async calculate(data: { a: number; b: number }): Promise<any> {
                    return await Promise.resolve({ result: data.a + data.b });
                }
            }

            const instance = new TestController('test');
            const result = await instance.calculate({ a: 5, b: 3 });
            expect(result).toEqual({ result: 8 });
        });

        it('should handle async and non-async methods', async () => {
            class TestController extends ControllerBase {
                @Endpoint('async')
                async asyncMethod() {
                    return await Promise.resolve({ type: 'async' });
                }

                @Endpoint('sync')
                syncMethod() {
                    return { type: 'sync' };
                }
            }

            const instance = new TestController('test');
            const asyncResult = await instance.asyncMethod();
            const syncResult = instance.syncMethod();

            expect(asyncResult).toEqual({ type: 'async' });
            expect(syncResult).toEqual({ type: 'sync' });
        });
    });

    describe('ControllerBase and @Endpoint integration', () => {
        it('should combine ControllerBase and endpoint decorators correctly', () => {
            class IntegrationController extends ControllerBase {
                @Endpoint('test', { asBytes: true })
                testEndpoint(data: Uint8Array) {
                    return { size: data.length };
                }

                @Endpoint('another')
                anotherEndpoint() {
                    return { message: 'hello' };
                }
            }

            const instance = new IntegrationController('integration', { queue: 'integration-workers' });

            // Check controller properties
            expect(instance.group).toBe('integration');
            expect(instance.queue).toBe('integration-workers');

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

            class UserController extends ControllerBase {
                @Endpoint('create', { schema: userSchema })
                createUser(data: z.infer<typeof userSchema>) {
                    return { id: 123, ...data };
                }
            }

            const instance = new UserController('user');
            const endpoint = instance.endpoints[0];

            expect(endpoint!.name).toBe('create');
            expect(endpoint!.options.schema).toBe(userSchema);
        });

        it('should handle complex endpoint configurations', () => {
            const dataSchema = z.object({
                id: z.string(),
                payload: z.unknown(),
            });

            class ComplexController extends ControllerBase {
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

            const instance = new ComplexController('complex', { queue: 'complex-processors' });
            const endpoint = instance.endpoints[0]!;

            expect(instance.group).toBe('complex');
            expect(instance.queue).toBe('complex-processors');
            expect(endpoint.name).toBe('process');
            expect(endpoint.options).toMatchObject({
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
            class EmptyNameController extends ControllerBase {}

            const instance = new EmptyNameController('');
            expect(instance.group).toBe('');
        });

        it('should handle empty endpoint name', () => {
            class TestController extends ControllerBase {
                @Endpoint('')
                emptyEndpoint() {
                    return {};
                }
            }

            const endpoints = new TestController('test').endpoints;
            expect(endpoints[0]!.name).toBe('');
        });

        it('should not interfere with non-decorated classes', () => {
            class RegularClass {
                regularMethod() {
                    return 'regular';
                }
            }

            const instance = new RegularClass();
            expect((RegularClass as any).__endpoints__).toBeUndefined();
            expect(instance.regularMethod()).toBe('regular');
        });
    });

    describe('Metadata and reflection', () => {
        it('should preserve all endpoint metadata for framework use', () => {
            const schema = z.object({ id: z.number() });

            class MetadataController extends ControllerBase {
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

            const instance = new MetadataController('metadata-test', { queue: 'test-queue' });
            const endpoint = instance.endpoints[0]!;

            // Verify all metadata is preserved
            expect(endpoint.name).toBe('rich-endpoint');
            expect(endpoint.options.schema).toBe(schema);
            expect(endpoint.options.asBytes).toBe(false);
            expect(endpoint.options.queue).toBe('endpoint-queue');
            expect(endpoint.options.metadata).toEqual({
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
