// app.module.ts
import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { appConfig, mongoConfig, redisConfig } from './configs';
import { CoinsModule } from './modules/coins/coins.module';
import { CacheModule } from '@nestjs/cache-manager';
import { UsersModule } from './modules/users/users.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      load: [appConfig, mongoConfig, redisConfig],
    }),
    CacheModule.register({
      isGlobal: true, // har yerda foydalanish uchun
      ttl: 3600 * 1000, // 1 soat (millisecondlarda)
      max: 10000  ,         // maksimal cache elementlar soni
    }),
    CoinsModule,
    UsersModule,
  ],
  controllers: [],
  providers: [],
})
export class AppModule { }