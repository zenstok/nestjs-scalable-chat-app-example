import { IsUUID } from 'class-validator';
import { SendMessageToAllDto } from './send-message-to-all.dto';

export class SendMessageToOneDto extends SendMessageToAllDto {
  @IsUUID()
  participantId: string;
}
