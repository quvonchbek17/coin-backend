import { Module } from '@nestjs/common';
import { UsersService } from './users.service';
import { UsersController } from './users.controller';
import { UsersGateway } from './users.gateway';
import { MongoModule } from 'modules/mongo';
import { CoinsService } from 'modules/coins/coins.service';

@Module({
  imports: [MongoModule],
  controllers: [UsersController],
  providers: [UsersService, UsersGateway, CoinsService]
})
export class UsersModule {}
