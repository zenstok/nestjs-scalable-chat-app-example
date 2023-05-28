import {
  Controller,
  InternalServerErrorException,
  Post,
  Request,
  UseGuards,
} from '@nestjs/common';
import { Request as ExpressRequest } from 'express';

import { LocalAuthGuard } from './guards/local-auth.guard';
import { AuthService } from './auth.service';
import { Public } from './decorators/public.decorator';
import { ApiTags } from '@nestjs/swagger';
import { ApiProperty } from '@nestjs/swagger';
import { ApiImplicitBody } from '@nestjs/swagger/dist/decorators/api-implicit-body.decorator';

class LoginDto {
  @ApiProperty({
    example: 'test@test.com',
    description: 'user email',
    required: true,
  })
  email: string;

  @ApiProperty({
    example: '1234',
    description: 'user password',
    required: true,
  })
  password: string;
}

@ApiTags('Auth')
@Controller('auth')
export class AuthController {
  constructor(private authService: AuthService) {}

  @ApiImplicitBody({ name: '', type: LoginDto, content: {} })
  @Public()
  @UseGuards(LocalAuthGuard)
  @Post('login')
  login(@Request() req: ExpressRequest) {
    if (!req.user) {
      throw new InternalServerErrorException();
    }
    return this.authService.login(req.user);
  }
}
