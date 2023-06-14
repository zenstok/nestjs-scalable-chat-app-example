import { IsString, Length } from 'class-validator';

export class SendMessageToAllDto {
  @IsString()
  @Length(1, 5000)
  message: string;
}
