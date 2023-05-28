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

enum RedisSubscribeChannel {
  SendWsMessageToAllClients = 'send_ws_message_to_all_clients',
  SendWsMessageToSomeClients = 'send_ws_message_to_some_clients',
  SendWsMessageToOneClient = 'send_ws_message_to_one_client',
}

interface RedisPubSubMessage {
  from: string;
  message: string;
}

interface RedisPubSubMessageWithClientId extends RedisPubSubMessage {
  clientId: string;
}

interface RedisPubSubMessageWithClientIds extends RedisPubSubMessage {
  clientIds: string[];
}

@Injectable()
export class WsClientManager {
  private readonly logger = new Logger(this.constructor.name);
  private readonly connectedClients = new Map<string, any[]>();
  private readonly redisClientId = `ws_socket_client-${crypto.randomUUID()}`;

  constructor(
    @InjectRedis('subscriber') private readonly subscriberRedis: Redis,
    @InjectRedis('publisher') private readonly publisherRedis: Redis,
  ) {
    this.subscriberRedis.subscribe(
      RedisSubscribeChannel.SendWsMessageToAllClients,
    );
    this.subscriberRedis.subscribe(
      RedisSubscribeChannel.SendWsMessageToSomeClients,
    );
    this.subscriberRedis.subscribe(
      RedisSubscribeChannel.SendWsMessageToOneClient,
    );

    this.subscriberRedis.on('message', (channel, message) => {
      const data = JSON.parse(message) as RedisPubSubMessage;
      if (data.from !== this.redisClientId) {
        switch (channel) {
          case RedisSubscribeChannel.SendWsMessageToAllClients:
            this.sendMessageToAllClients(data.message, false);
            break;
          case RedisSubscribeChannel.SendWsMessageToSomeClients:
            this.sendMessageToClients(
              (data as RedisPubSubMessageWithClientIds).clientIds,
              data.message,
              false,
            );
            break;
          case RedisSubscribeChannel.SendWsMessageToOneClient:
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
    this.logger.debug(`Add ws connection: ${authUserTokenData.email}`);
    const userId = authUserTokenData.sub;

    this.setUserIdOnClient(client, userId);
    const clientsPool = this.getClientsPool(client);
    this.connectedClients.set(
      userId,
      clientsPool ? [...clientsPool, client] : [client],
    );

    setTimeout(() => {
      client.close(); // will trigger removeConnection from lifecycle gateway handleDisconnect
    }, this.getConnectionLimit(authUserTokenData));
  }

  removeConnection(client: any) {
    const clientsPool = this.getClientsPool(client);

    if (clientsPool === undefined) {
      return;
    }
    this.logger.debug(`Remove ws connection: ${client.userId}`);

    const newPool = clientsPool!.filter((c) => c !== client);

    if (!newPool.length) {
      this.connectedClients.delete(client.userId);
    } else {
      this.connectedClients.set(client.userId, newPool);
    }
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
        RedisSubscribeChannel.SendWsMessageToOneClient,
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
      this.publisherRedis.publish(
        RedisSubscribeChannel.SendWsMessageToSomeClients,
        JSON.stringify({
          message,
          clientIds,
          from: this.redisClientId,
        }),
      );
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
        RedisSubscribeChannel.SendWsMessageToAllClients,
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
}
