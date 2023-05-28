import { WebSocketGateway } from '@nestjs/websockets';
import {
  ClassSerializerInterceptor,
  UseFilters,
  UseInterceptors,
  UsePipes,
  ValidationPipe,
} from '@nestjs/common';
import { BadRequestExceptionFilter } from '../../filters/ws-exception.filter';

@UseInterceptors(ClassSerializerInterceptor)
@UseFilters(BadRequestExceptionFilter)
@UsePipes(
  new ValidationPipe({
    transform: true,
    forbidNonWhitelisted: true,
    whitelist: true,
  }),
)
@WebSocketGateway({ path: '/entrypoint' })
export class EntrypointGateway {}
