import { type Msg, type NatsConnection, NatsError, type Service } from 'nats';
import { type ErrorResponse, NexusApp } from '../../core/nexus-nf';
import { CONTROLLER_MARKER, type EndpointEntry, type NexusController } from '../../core/decorators';
import { mockNatsConnection, mockService } from '../mocks/nats.mock';
import { DuplicateControllerError, InvalidControllerError } from '../../core/errors';
import * as z from 'zod';

jest.mock('nats');

describe('NexusApp', () => {
    let natsConnection: NatsConnection;
    let service: Service;
    let app: NexusApp;

    const mockHandler = jest.fn();

    // Mock data factories
    const createMockController = (overrides: Partial<NexusController> = {}): NexusController => ({
        constructor: { [CONTROLLER_MARKER]: true } as any,
        group: 'test',
        endpoints: [
            {
                name: 'first-test-endpoint',
                handler: mockHandler,
                options: {
                    metadata: { test: '1' },
                },
            },
            {
                name: 'second-test-endpoint',
                handler: mockHandler,
                options: {
                    metadata: { test: '2' },
                },
            },
        ],
        ...overrides,
    });

    const createMockMessage = (overrides: Partial<Msg> = {}): Msg => ({
        sid: 0,
        subject: 'test',
        respond: jest.fn(),
        json: jest.fn(),
        string: jest.fn(),
        data: Buffer.from('test'),
        ...overrides,
    });

    const createZodEndpoint = (schema: z.ZodSchema, name = 'zod-test'): EndpointEntry => ({
        name,
        options: { schema },
        handler: async () => await Promise.resolve({ success: true }),
    });

    beforeEach(() => {
        process.env['NODE_ENV'] = '';
        jest.clearAllMocks();
        natsConnection = mockNatsConnection as any;
        service = mockService as any;
        app = new NexusApp(natsConnection, service);
    });

    describe('constructor', () => {
        it('should initialize with NATS connection and service', () => {
            expect(app.natsConnection).toBe(natsConnection);
            expect(app.service).toBe(service);
        });

        it('should create a services client', () => {
            expect(natsConnection.services.client).toHaveBeenCalled();
        });
    });

    describe('shutdown', () => {
        it('should gracefully stop service and close connection', async () => {
            await app.shutdown();

            expect(service.stop).toHaveBeenCalled();
            expect(natsConnection.close).toHaveBeenCalled();
        });
    });

    describe('registerController', () => {
        describe('validation', () => {
            it('should reject invalid controller class', () => {
                const invalidController = {} as any;

                expect(() => app.registerController(invalidController)).toThrow(InvalidControllerError);
            });

            it('should reject duplicate controller registration', () => {
                const controller = createMockController();

                // Register controller once
                app.registerController(controller);

                // Register again, expect error to be thrown
                expect(() => app.registerController(controller)).toThrow(DuplicateControllerError);
            });
        });

        describe('service registration', () => {
            it('should create service group for controller', () => {
                const controller = createMockController();

                app.registerController(controller);

                expect(service.addGroup).toHaveBeenCalledWith(controller.group);
            });

            it('should register multiple controller endpoints', () => {
                const controller = createMockController();

                app.registerController(controller);

                const groupMock = service.addGroup(controller.group);
                const addEndpointMock = groupMock.addEndpoint;

                expect(addEndpointMock).toHaveBeenCalledTimes(controller.endpoints.length);

                controller.endpoints.forEach((endpoint, index) => {
                    expect(addEndpointMock).toHaveBeenNthCalledWith(
                        index + 1,
                        endpoint.name,
                        expect.objectContaining(endpoint.options)
                    );
                });
            });
        });
    });

    describe('wrapHandler', () => {
        let mockMessage: Msg;
        let controller: NexusController;

        beforeEach(() => {
            mockMessage = createMockMessage();
            controller = createMockController();
        });

        const getRegisteredHandler = (endpointIndex = 0, controllerRef: NexusController | undefined = undefined) => {
            controllerRef ??= controller;
            app.registerController(controllerRef);
            const groupMock = service.addGroup(controllerRef.group);
            const addEndpointCalls = (groupMock.addEndpoint as jest.Mock).mock.calls;
            return addEndpointCalls[endpointIndex][1].handler;
        };

        describe('error handling', () => {
            it('should handle NatsError and return formatted error response', async () => {
                const natsError = new NatsError('', '');
                natsError.message = 'Test nats error';
                natsError.code = '503';

                const handler = getRegisteredHandler();
                await handler(natsError, mockMessage);

                const expectedResponse: ErrorResponse = {
                    error: true,
                    code: '503',
                    message: 'Test nats error',
                    details: undefined,
                };

                const response = JSON.parse((mockMessage.respond as jest.Mock).mock.calls[0][0]);
                expect(response).toEqual(expectedResponse);
            });

            it('should handle NatsError without error code', async () => {
                const natsError = new NatsError('', '');
                natsError.message = 'Test nats error';

                const handler = getRegisteredHandler();
                await handler(natsError, mockMessage);

                const expectedResponse: ErrorResponse = {
                    error: true,
                    code: '500',
                    message: 'Test nats error',
                    details: undefined,
                };

                const response = JSON.parse((mockMessage.respond as jest.Mock).mock.calls[0][0]);
                expect(response).toEqual(expectedResponse);
            });

            it('should handle Zod validation errors with detailed information', async () => {
                const schema = z.object({
                    testString: z.string(),
                    testNumber: z.number(),
                });

                const zodEndpoint = createZodEndpoint(schema);
                controller.endpoints.push(zodEndpoint);

                const invalidData = { testString: 123, testNumber: 'test' };
                mockMessage.json = jest.fn().mockReturnValue(invalidData);

                // Get expected validation details
                let expectedDetails;
                try {
                    schema.parse(invalidData);
                } catch (err) {
                    expectedDetails = (err as z.ZodError).issues;
                }

                const handler = getRegisteredHandler(2); // Third endpoint (index 2)
                await handler(null, mockMessage);

                const response = JSON.parse((mockMessage.respond as jest.Mock).mock.calls[0][0]);

                expect(response).toEqual({
                    error: true,
                    code: '400',
                    message: 'Bad Request: Validation failed.',
                    details: expectedDetails,
                });
            });

            it('should handle unknown error types', () => {
                const unknownError = 'string error';

                const response = (app as any).formatErrorResponse(unknownError);

                expect(response).toEqual({
                    error: true,
                    code: '500',
                    message: 'An unknown internal error occurred.',
                    details: undefined,
                });
            });

            it('should include error details in development environment for regular errors', () => {
                process.env['NODE_ENV'] = 'dev';
                const devApp = new NexusApp(natsConnection, service);

                const error = new Error('Test error');
                error.stack = 'Sample stack trace';

                const errorResponse = (devApp as any).formatErrorResponse(error);

                expect(errorResponse.details).toEqual({
                    name: 'Error',
                    message: 'Test error',
                    stack: 'Sample stack trace',
                });
            });

            it('should include error details in development environment for NATS errors', () => {
                process.env['NODE_ENV'] = 'dev';
                const devApp = new NexusApp(natsConnection, service);

                const error = new NatsError('Test error', '500');
                error.name = 'Test error';
                error.stack = 'Sample stack trace';

                const errorResponse = (devApp as any).formatErrorResponse(error);

                expect(errorResponse.details).toEqual({
                    name: error.name,
                    stack: error.stack,
                });
            });

            it('should exclude error details in production environment', () => {
                process.env['NODE_ENV'] = 'production';
                const prodApp = new NexusApp(natsConnection, service);

                const error = new Error('Test error');
                const errorResponse = (prodApp as any).formatErrorResponse(error);

                expect(errorResponse.details).toBeUndefined();
            });

            it('should handle data parsing errors', async () => {
                mockMessage.json = jest.fn().mockImplementation(() => {
                    throw new Error('Test parse error');
                });

                const handler = getRegisteredHandler();
                await handler(null, mockMessage);

                const response = JSON.parse((mockMessage.respond as jest.Mock).mock.calls[0][0]);
                expect(response.error).toBe(true);
                expect(response.code).toBe('500');
            });

            it('should handle non-errors being thrown', async () => {
                mockMessage.json = jest.fn().mockImplementation(() => {
                    throw new Number();
                });

                const handler = getRegisteredHandler();
                await handler(null, mockMessage);

                const response = JSON.parse((mockMessage.respond as jest.Mock).mock.calls[0][0]);
                expect(response.error).toBe(true);
                expect(response.code).toBe('500');
            });
        });

        describe('message processing', () => {
            it('should parse JSON message and call handler', async () => {
                const requestData = { hello: 'world' };
                const expectedResponse = { success: true };

                mockMessage.json = jest.fn().mockReturnValue(requestData);
                mockHandler.mockResolvedValue(expectedResponse);

                const handler = getRegisteredHandler();
                await handler(null, mockMessage);

                expect(mockHandler).toHaveBeenCalledWith(requestData, undefined);

                const response = JSON.parse((mockMessage.respond as jest.Mock).mock.calls[0][0]);
                expect(response.error).toBe(false);
                expect(response.data).toEqual(expectedResponse);
            });

            it('should handle non-JSON string messages', async () => {
                const requestData = 'test';
                const expectedResponse = { success: true };

                mockMessage.json = jest.fn().mockImplementation(() => {
                    throw new NatsError('Bad JSON', '500');
                });
                mockMessage.string = jest.fn().mockReturnValue(requestData);
                mockHandler.mockResolvedValue(expectedResponse);

                const handler = getRegisteredHandler();
                await handler(null, mockMessage);

                expect(mockHandler).toHaveBeenCalledWith(requestData, undefined);

                const response = JSON.parse((mockMessage.respond as jest.Mock).mock.calls[0][0]);
                expect(response.error).toBe(false);
                expect(response.data.success).toBe(true);
            });

            it('should handle byte array messages', async () => {
                const bytesController = createMockController({ group: 'bytes' });
                const endpoint: EndpointEntry = {
                    handler: mockHandler,
                    name: 'test-byte-endpoint',
                    options: {
                        asBytes: true,
                    },
                };
                bytesController.endpoints.push(endpoint);

                const requestData = new Uint8Array(new ArrayBuffer(8));
                const expectedResponse = { success: true };

                mockMessage.data = requestData;
                mockHandler.mockResolvedValue(expectedResponse);

                const handler = getRegisteredHandler(bytesController.endpoints.indexOf(endpoint), bytesController);
                await handler(null, mockMessage);

                expect(mockHandler).toHaveBeenCalledWith(requestData, undefined);

                const response = JSON.parse((mockMessage.respond as jest.Mock).mock.calls[0][0]);
                expect(response.error).toBe(false);
                expect(response.data.success).toBe(true);
            });

            it('should successfully validate and process data with Zod schema', async () => {
                const schema = z.object({
                    testString: z.string(),
                    testNumber: z.number(),
                });
                const zodEndpoint = createZodEndpoint(schema, 'valid-zod-test');

                controller.endpoints.push(zodEndpoint);

                const validData = { testString: 'hello world', testNumber: 123 };
                mockMessage.json = jest.fn().mockReturnValue(validData);

                const handler = getRegisteredHandler(controller.endpoints.length - 1); // Get last endpoint
                await handler(null, mockMessage);

                const response = JSON.parse((mockMessage.respond as jest.Mock).mock.calls[0][0]);
                expect(response.error).toBe(false);
            });
        });
    });
});
