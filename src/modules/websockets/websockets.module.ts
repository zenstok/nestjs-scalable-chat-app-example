import { Module } from '@nestjs/common';
import { EntrypointGateway } from './gateways/entrypoint/entrypoint.gateway';
import { LifecycleGateway } from './gateways/extensions/lifecycle/lifecycle.gateway';
import { ChatGateway } from './gateways/extensions/chat/chat.gateway';
import { JwtModule } from '@nestjs/jwt';
import { WsClientManager } from './services/ws-client-manager';

@Module({
  imports: [JwtModule],
  providers: [
    WsClientManager,
    EntrypointGateway,
    LifecycleGateway,
    ChatGateway,
  ],
  exports: [WsClientManager],
})
export class WebsocketsModule {}
