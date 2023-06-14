import { IsArray, IsUUID } from 'class-validator';
import { SendMessageToAllDto } from './send-message-to-all.dto';

export class SendMessageToManyDto extends SendMessageToAllDto {
  @IsArray()
  @IsUUID(undefined, { each: true })
  participantIds: string[];
}
