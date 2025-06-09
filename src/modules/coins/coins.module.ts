import { Module } from '@nestjs/common';
import { CoinsService } from './coins.service';
import { CoinsController } from './coins.controller';
import { CoinsGateway } from './coins.gateway';
import { MongoModule } from 'modules/mongo';
import { UsersService } from 'modules/users/users.service';

@Module({
  imports: [MongoModule],
  controllers: [CoinsController],
  providers: [CoinsService, UsersService, CoinsGateway]
})
export class CoinsModule {}
