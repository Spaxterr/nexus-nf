import {
    type Msg,
    type NatsConnection,
    type NatsError,
    type Service,
    type ServiceClient,
    type ServiceGroup,
} from 'nats';
import { type EndpointHandler, type NexusController } from './decorators';

export class NexusApp {
    public readonly natsConnection: NatsConnection;
    public readonly service: Service;
    public readonly client: ServiceClient;
    private readonly groups: { [key: string]: ServiceGroup };

    constructor(natsConnection: NatsConnection, natsService: Service) {
        this.natsConnection = natsConnection;
        this.service = natsService;
        this.client = natsConnection.services.client();
        this.groups = {};
    }

    public registerController(controller: NexusController) {
        const group = this.groups[controller.group] ?? this.service.addGroup(controller.group);
        this.groups[controller.group] ??= group;

        for (const endpoint of controller.endpoints) {
            group.addEndpoint(endpoint.subject!, {
                handler: async (err: NatsError | null, msg: Msg) => {
                    await this.wrapHandler(endpoint.handler, err, msg);
                },
                queue: controller.queue,
            });
        }
    }

    private async wrapHandler(handler: EndpointHandler, err: NatsError | null, msg: Msg): Promise<void> {
        if (err !== null) {
            msg.respond(JSON.stringify(err));
            return;
        }

        let data;
        try {
            data = msg.json<Parameters<typeof handler>>();
        } catch (err) {
            data = msg.data;
            console.error(err);
        }
        const result = await handler(data);
        msg.respond(result);
    }
}
