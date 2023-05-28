import { IsEmail, IsNotEmpty, IsString, Length } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class CreateUserDto {
  @ApiProperty({
    example: 'test@example.com',
    description: 'user email',
    required: true,
  })
  @IsNotEmpty()
  @IsEmail()
  @Length(1, 100)
  email: string;

  @ApiProperty()
  @IsNotEmpty()
  @IsString()
  @Length(4, 100)
  password: string;
}
