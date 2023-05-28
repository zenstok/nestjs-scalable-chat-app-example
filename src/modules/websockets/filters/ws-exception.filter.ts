import { ArgumentsHost, BadRequestException, Catch } from '@nestjs/common';
import { BaseWsExceptionFilter } from '@nestjs/websockets';

@Catch(BadRequestException)
export class BadRequestExceptionFilter extends BaseWsExceptionFilter {
  catch(exception: BadRequestException, host: ArgumentsHost) {
    host
      .switchToWs()
      .getClient()
      .send(
        JSON.stringify({
          event: 'exception',
          data: exception.getResponse(),
        }),
      );
  }
}
