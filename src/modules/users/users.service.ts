import { Inject, Injectable, Logger, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import { CreateUserDto } from './dto/create-user.dto';
import { InjectModel } from '@nestjs/mongoose';
import { Users, usersDocument } from 'modules/mongo';
import { Model } from 'mongoose';
import { CACHE_MANAGER } from '@nestjs/cache-manager';
import { Cache } from 'cache-manager';

@Injectable()
export class UsersService implements OnModuleInit, OnModuleDestroy {
  private readonly BATCH_INTERVAL = 5000;
  private pendingUpdates: { [userId: string]: number } = {};
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
  ) { }
  async createOrGetUser(body: CreateUserDto): Promise<any> {
    let user = await this.userModel.findOne({ id: body.id })
    if (user) {
      let seconds = this.secondsPassedSince(user.lastCalculatedEnergyDate)
      let energy = seconds > 0 ? user.energy + seconds * user.energyQuality : user.energy
      user.energy = energy >= user.energyCapacity ? user.energyCapacity : energy
      user.lastCalculatedEnergyDate = new Date()
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
      return user
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

  async findById(userId: string): Promise<any> {
    let user = await this.userModel.findOne({ id: userId })
    if (user && user.lastCalculatedEnergyDate) {
      let seconds = this.secondsPassedSince(user.lastCalculatedEnergyDate)
      let energy = seconds > 0 ? user.energy + seconds * user.energyQuality : user.energy
      user.energy = energy >= user.energyCapacity ? user.energyCapacity : energy
      user.lastCalculatedEnergyDate = new Date()
      user.save()
      return user
    }

    if (user) {
      return user
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

  secondsPassedSince(givenDate: Date): number {
    const now = new Date(); // Hozirgi vaqt
    const timeDifference = now.getTime() - givenDate.getTime(); // Millisekundlarda farq
    const seconds = Math.floor(timeDifference / 1000); // Sekundlarga aylantirish
    return seconds;
  }
}
