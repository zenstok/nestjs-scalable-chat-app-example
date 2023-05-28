import {
  OnGatewayConnection,
  OnGatewayDisconnect,
  OnGatewayInit,
} from '@nestjs/websockets';
import { EntrypointGateway } from '../../entrypoint/entrypoint.gateway';
import { Injectable, Logger } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { jwtConstants } from '../../../../auth/constants';
import {
  DecodedAuthToken,
  WsClientManager,
} from '../../../services/ws-client-manager';

@Injectable()
export class LifecycleGateway
  extends EntrypointGateway
  implements OnGatewayInit, OnGatewayConnection, OnGatewayDisconnect
{
  private readonly logger = new Logger(LifecycleGateway.name);

  constructor(
    private readonly jwtService: JwtService,
    private readonly wsClientManager: WsClientManager,
  ) {
    super();
  }

  afterInit() {
    this.logger.debug('Websockets initialized ' + this.constructor.name);
  }

  handleConnection(client: any) {
    const authUserTokenData = this.getDecodedAuthToken(client);

    if (!authUserTokenData) {
      client.close();
      return;
    }

    this.wsClientManager.addConnection(client, authUserTokenData);
  }

  handleDisconnect(client: any) {
    this.wsClientManager.removeConnection(client);
  }

  getDecodedAuthToken(client: any) {
    let decodedJwt: DecodedAuthToken | null = null;

    try {
      if (client.protocol) {
        decodedJwt = this.jwtService.verify(client.protocol, {
          secret: jwtConstants.secret,
        }) as DecodedAuthToken;
      }
    } catch (e) {}

    return decodedJwt;
  }
}
