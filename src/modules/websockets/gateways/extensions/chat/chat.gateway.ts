import { MessageBody, SubscribeMessage } from '@nestjs/websockets';
import { EntrypointGateway } from '../../entrypoint/entrypoint.gateway';
import { Injectable, Logger } from '@nestjs/common';
import { AuthUserId } from '../../../decorator/auth-user-id.decorator';
import { WsClientManager } from '../../../services/ws-client-manager';
import { SendMessageDto } from './dto/send-message.dto';

enum SubscribeMessageType {
  SendChatMessageToParticipant = 'send_chat_message_to_participant',
}

@Injectable()
export class ChatGateway extends EntrypointGateway {
  private readonly logger = new Logger(this.constructor.name);

  constructor(private readonly wsClientManager: WsClientManager) {
    super();
  }

  @SubscribeMessage(SubscribeMessageType.SendChatMessageToParticipant)
  async sendChatMessageToAll(
    @MessageBody() dto: SendMessageDto,
    @AuthUserId() authUserId: string,
  ) {
    this.logger.debug(
      `${authUserId} sent message "${dto.message}" to ${dto.participantId}`,
    );
    this.wsClientManager.sendMessageToClient(dto.participantId, dto.message);
  }
}
