import { IsString, IsUUID, Length } from 'class-validator';

export class SendMessageDto {
  @IsString()
  @Length(1, 5000)
  message: string;

  @IsUUID()
  participantId: string;
}
