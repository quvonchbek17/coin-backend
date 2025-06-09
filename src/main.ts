import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { Logger, ValidationPipe } from '@nestjs/common';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  app.enableCors({ origin: '*' });

  const PORT = parseInt(process.env.SERVER_PORT) || 3377;
  const logger = new Logger('Main');


  await app.listen(PORT, () => {
    logger.debug(`Server started on port ${PORT}`);
  });
}
bootstrap();
