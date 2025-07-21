export const mockService = {
    addEndpoint: jest.fn(),
    addGroup: jest.fn().mockReturnThis(),
    stop: jest.fn(),
};

export const mockNatsConnection = {
    services: {
        add: jest.fn(() => mockService),
        client: jest.fn(),
    },
    close: jest.fn(),
};

export class NatsError extends Error {
    public code: string;

    constructor(message: string, code: string) {
        super(message);
        this.code = code;
    }
}

export const connect = jest.fn(async () => await Promise.resolve(mockNatsConnection));
