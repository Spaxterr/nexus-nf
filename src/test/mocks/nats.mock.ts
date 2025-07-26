export const mockService = {
    addEndpoint: jest.fn(),
    addGroup: jest.fn().mockReturnThis(),
    stop: jest.fn(),
    info: jest.fn().mockReturnValue({
        name: 'test-service',
        version: '0.0.0',
        id: 'TESTSVC',
        description: 'Test service',
    }),
};

export const mockNatsConnection = {
    services: {
        add: jest.fn(() => mockService),
        client: jest.fn(),
    },
    close: jest.fn(),
    getServer: jest.fn().mockReturnValue('0.0.0.0:4222'),
};

export class NatsError extends Error {
    public code: string;

    constructor(message: string, code: string) {
        super(message);
        this.code = code;
    }
}

export const connect = jest.fn(async () => await Promise.resolve(mockNatsConnection));
