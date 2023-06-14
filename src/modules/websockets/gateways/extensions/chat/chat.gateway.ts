import { MessageBody, SubscribeMessage } from '@nestjs/websockets';
import { EntrypointGateway } from '../../entrypoint/entrypoint.gateway';
import { Injectable, Logger } from '@nestjs/common';
import { AuthUserId } from '../../../decorator/auth-user-id.decorator';
import { WsClientManager } from '../../../services/ws-client-manager';
import { SendMessageToOneDto } from './dto/send-message-to-one.dto';
import { SendMessageToManyDto } from './dto/send-message-to-many.dto';
import { SendMessageToAllDto } from './dto/send-message-to-all.dto';

enum SubscribeMessageType {
  SendChatMessageToOneParticipant = 'send_chat_message_to_one_participant',
  SendChatMessageToManyParticipants = 'send_chat_message_to_many_participants',
  SendChatMessageToAllParticipant = 'send_chat_message_to_all_participants',
}

@Injectable()
export class ChatGateway extends EntrypointGateway {
  private readonly logger = new Logger(this.constructor.name);

  constructor(private readonly wsClientManager: WsClientManager) {
    super();
  }

  @SubscribeMessage(SubscribeMessageType.SendChatMessageToOneParticipant)
  async sendChatMessageToParticipant(
    @MessageBody() dto: SendMessageToOneDto,
    @AuthUserId() authUserId: string,
  ) {
    this.logger.debug(
      `${authUserId} sent message "${dto.message}" to ${dto.participantId}`,
    );
    this.wsClientManager.sendMessageToClient(dto.participantId, dto.message);
  }

  @SubscribeMessage(SubscribeMessageType.SendChatMessageToOneParticipant)
  async sendChatMessageToOneParticipant(
    @MessageBody() dto: SendMessageToOneDto,
    @AuthUserId() authUserId: string,
  ) {
    this.logger.debug(
      `${authUserId} sent message "${dto.message}" to ${dto.participantId}`,
    );
    this.wsClientManager.sendMessageToClient(dto.participantId, dto.message);
  }

  @SubscribeMessage(SubscribeMessageType.SendChatMessageToManyParticipants)
  async sendChatMessageToManyParticipant(
    @MessageBody() dto: SendMessageToManyDto,
    @AuthUserId() authUserId: string,
  ) {
    this.logger.debug(
      `${authUserId} sent message "${dto.message}" to ${dto.participantIds}`,
    );
    this.wsClientManager.sendMessageToClients(dto.participantIds, dto.message);
  }

  @SubscribeMessage(SubscribeMessageType.SendChatMessageToAllParticipant)
  async sendChatMessageToAllParticipant(
    @MessageBody() dto: SendMessageToAllDto,
    @AuthUserId() authUserId: string,
  ) {
    this.logger.debug(`${authUserId} sent global message "${dto.message}"`);
    this.wsClientManager.sendMessageToAllClients(dto.message);
  }
}
