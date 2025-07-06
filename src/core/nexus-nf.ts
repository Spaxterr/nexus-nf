import { Msg, type NatsConnection, NatsError, type Service, ServiceClient, ServiceGroup } from 'nats';
import { type NexusController } from './decorators';

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

    public addController(controller: NexusController) {
        const group = this.groups[controller.group] ?? this.service.addGroup(controller.group);
        this.groups[controller.group] ??= group;

        for (const endpoint of controller.endpoints) {
            group.addEndpoint(endpoint.subject!, {
                handler: async (err: NatsError | null, msg: Msg) => {
                    if (err !== null) {
                        msg.respond(JSON.stringify({ err }));
                        return;
                    }

                    const data = msg.json<Parameters<typeof endpoint.handler>>();
                    const result = await endpoint.handler(data);
                    msg.respond(result);
                },
                queue: controller.queue,
            });
        }
    }
}
