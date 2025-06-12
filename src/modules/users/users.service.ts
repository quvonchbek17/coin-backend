import { Inject, Injectable, Logger, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import { CreateUserDto } from './dto/create-user.dto';
import { InjectModel } from '@nestjs/mongoose';
import { Users, usersDocument } from 'modules/mongo';
import { Model } from 'mongoose';
import { CACHE_MANAGER } from '@nestjs/cache-manager';
import { Cache } from 'cache-manager';
import { CoinsService } from 'modules/coins/coins.service';

@Injectable()
export class UsersService implements OnModuleInit, OnModuleDestroy {
  private readonly BATCH_INTERVAL = 5000;
  private pendingUpdates: { [id: string]: number } = {};
  private intervalId: NodeJS.Timeout;
  private readonly logger = new Logger(UsersService.name);

  onModuleInit() {
    this.logger.log('CoinsService initialized with in-memory cache.');
  }

  onModuleDestroy() {
    this.logger.log('CoinsService destroyed, flushing updates.');
  }

  constructor(
    @InjectModel(Users.name) private userModel: Model<usersDocument>,
    @Inject(CACHE_MANAGER) private cacheManager: Cache,
    private readonly coinService: CoinsService
  ) { }
  async createOrGetUser(body: CreateUserDto): Promise<any> {
    let user = await this.userModel.findOne({ id: body.id });
    if (user) {
      let userData = await this.coinService.getUserDatas({ id: user.id })
      if (!user.refCode) {
        let code = this.generateCode();
        let existingCode = await this.userModel.findOne({ refCode: code });
        while (existingCode) {
          code = this.generateCode();
          existingCode = await this.userModel.findOne({ refCode: code });
        }
        user.refCode = code
        user.save()
      }
      userData.refCode = user.refCode
      return userData
    } else {
      let code = this.generateCode();
      let existingCode = await this.userModel.findOne({ refCode: code });
      while (existingCode) {
        code = this.generateCode();
        existingCode = await this.userModel.findOne({ refCode: code });
      }
      let newUser = await this.userModel.create({ ...body, refCode: code })
      return newUser
    }
  }


  generateCode(length = 15) {
    const characters = "abcdefghijklmnopqrstuvwxyz0123456789";
    let code = "";
    for (let i = 0; i < length; i++) {
      const randomIndex = Math.floor(Math.random() * characters.length);
      code += characters[randomIndex];
    }
    return code;
  }

}
