import { Injectable, Logger } from '@nestjs/common';
import { InjectRedis } from '@liaoliaots/nestjs-redis';
import Redis from 'ioredis';
import * as crypto from 'crypto';

export type DecodedAuthToken = {
  sub: string;
  email: string;
  exp: number;
  iat: number;
};

interface RedisPubSubMessage {
  from: string;
  message: string;
}

interface RedisPubSubMessageWithClientId extends RedisPubSubMessage {
  clientId: string;
}

@Injectable()
export class WsClientManager {
  private readonly logger = new Logger(this.constructor.name);
  private readonly connectedClients = new Map<string, any[]>();

  private readonly redisClientId = `ws_socket_client-${crypto.randomUUID()}`;
  private readonly sendWsMessageToAllClientsRedisChannel = `send_ws_message_to_all_clients`;
  private readonly wsSocketClientRedisChannel = `ws_socket_client`;

  constructor(
    @InjectRedis('subscriber') private readonly subscriberRedis: Redis,
    @InjectRedis('publisher') private readonly publisherRedis: Redis,
  ) {
    this.subscriberRedis.subscribe(this.sendWsMessageToAllClientsRedisChannel);

    this.subscriberRedis.on('message', (channel, message) => {
      const data = JSON.parse(message) as RedisPubSubMessage;
      if (data.from !== this.redisClientId) {
        switch (true) {
          case channel === this.sendWsMessageToAllClientsRedisChannel:
            this.sendMessageToAllClients(data.message, false);
            break;
          case channel.startsWith(this.wsSocketClientRedisChannel):
            this.logger.warn(
              `I'm ${this.redisClientId} redis client. I'm subscribed to ${channel} which means i will also send the ws message to my ws clients.`,
            );
            this.sendMessageToClient(
              (data as RedisPubSubMessageWithClientId).clientId,
              data.message,
              false,
            );
            break;
          // no default
        }
      }
    });
  }

  addConnection(client: any, authUserTokenData: DecodedAuthToken) {
    this.logger.debug(
      `Add ws connection: ${authUserTokenData.email} on redis client id: ${this.redisClientId}`,
    );
    const userId = authUserTokenData.sub;

    this.setUserIdOnClient(client, userId);
    const clientsPool = this.getClientsPool(client);
    this.connectedClients.set(
      userId,
      clientsPool ? [...clientsPool, client] : [client],
    );

    this.subscriberRedis.subscribe(this.getClientIdRedisChannel(userId));

    setTimeout(() => {
      client.close(); // will trigger removeConnection from lifecycle gateway handleDisconnect
    }, this.getConnectionLimit(authUserTokenData));
  }

  removeConnection(client: any) {
    const clientsPool = this.getClientsPool(client);

    if (!clientsPool) {
      return;
    }
    this.logger.debug(
      `Remove ws connection: ${client.userId} from redis client id : ${this.redisClientId}`,
    );

    const newPool = clientsPool.filter((c) => c !== client);

    if (!newPool.length) {
      this.connectedClients.delete(client.userId);
    } else {
      this.connectedClients.set(client.userId, newPool);
    }

    this.subscriberRedis.unsubscribe(
      this.getClientIdRedisChannel(client.userId),
    );
  }

  private setUserIdOnClient(client: any, userId: string) {
    client.userId = userId;
  }

  private getClientsPool(client: any) {
    return this.connectedClients.get(client.userId);
  }

  private getConnectionLimit(tokenData: DecodedAuthToken) {
    return tokenData.exp * 1000 - Date.now();
  }

  getConnectedClientIds() {
    const clientIds: string[] = [];

    const iterator = this.connectedClients.keys();
    let current = iterator.next();
    while (!current.done) {
      clientIds.push(current.value);
      current = iterator.next();
    }

    return clientIds;
  }

  sendMessageToClient(
    clientId: string,
    message: string,
    shouldPublishToRedis = true,
  ) {
    if (shouldPublishToRedis) {
      this.publisherRedis.publish(
        this.getClientIdRedisChannel(clientId),
        JSON.stringify({
          message,
          clientId,
          from: this.redisClientId,
        }),
      );
    }

    const clientPool = this.connectedClients.get(clientId);

    if (clientPool) {
      clientPool.forEach((client) => {
        client.send(message);
      });
    }
  }

  sendMessageToClients(
    clientIds: string[],
    message: string,
    shouldPublishToRedis = true,
  ) {
    if (shouldPublishToRedis) {
      Array.from(new Set(clientIds)).forEach((clientId) => {
        this.publisherRedis.publish(
          this.getClientIdRedisChannel(clientId),
          JSON.stringify({
            message,
            clientId,
            from: this.redisClientId,
          }),
        );
      });
    }

    this.connectedClients.forEach((clientPool, clientId) => {
      if (clientIds.includes(clientId)) {
        clientPool.forEach((client) => {
          client.send(message);
        });
      }
    });
  }

  sendMessageToAllClients(message: string, shouldPublishToRedis = true) {
    if (shouldPublishToRedis) {
      this.publisherRedis.publish(
        this.sendWsMessageToAllClientsRedisChannel,
        JSON.stringify({
          message,
          from: this.redisClientId,
        }),
      );
    }

    this.connectedClients.forEach((clientPool) => {
      clientPool.forEach((client) => {
        client.send(message);
      });
    });
  }
  private getClientIdRedisChannel(userId: string) {
    return `${this.wsSocketClientRedisChannel}/${userId}`;
  }
}
