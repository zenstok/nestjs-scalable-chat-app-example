import { NestFactory } from '@nestjs/core';
import { AppModule } from '../app.module';
import { UserService } from '../modules/user/user.service';

async function bootstrap() {
  console.log('Db init started.');
  const application = await NestFactory.createApplicationContext(AppModule);

  const userService = application.get(UserService);

  const allUsers = await userService.findAll();
  if (allUsers.length === 0) {
    await userService.create({ email: 'test@test.com', password: '1234' });
    await userService.create({ email: 'test2@test.com', password: '1234' });
    await userService.create({ email: 'test3@test.com', password: '1234' });
    await userService.create({ email: 'test4@test.com', password: '1234' });
  }

  console.log('Db init completed.');

  await application.close();
  process.exit(0);
}

bootstrap();
