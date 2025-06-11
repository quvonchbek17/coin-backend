import { Module } from '@nestjs/common';
import { CoinsService } from './coins.service';
import { CoinsController } from './coins.controller';
import { CoinsGateway } from './coins.gateway';
import { MongoModule } from 'modules/mongo';

@Module({
  imports: [MongoModule],
  controllers: [CoinsController],
  providers: [CoinsService, CoinsGateway]
})
export class CoinsModule {}
