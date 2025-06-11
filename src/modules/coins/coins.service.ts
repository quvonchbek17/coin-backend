import {
  Injectable,
  OnModuleInit,
  OnModuleDestroy,
  Logger,
  Inject,
} from '@nestjs/common';
import { CACHE_MANAGER } from '@nestjs/cache-manager';
import { Cache } from 'cache-manager';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Users, usersDocument } from 'modules/mongo';

@Injectable()
export class CoinsService implements OnModuleInit, OnModuleDestroy {
  private readonly BATCH_INTERVAL = 5000;
  private BATCH_COUNT: number = 1;
  private readonly CLEAR_INTERVAL = 1000 * 60 * 2;
  private pendingUpdates: { [id: string]: Users } = {};
  private intervalId: NodeJS.Timeout;
  private readonly logger = new Logger(CoinsService.name);

  constructor(
    @InjectModel(Users.name) private userModel: Model<usersDocument>,
    @Inject(CACHE_MANAGER) private cacheManager: Cache
  ) { }

  onModuleInit() {
    this.intervalId = setInterval(() => this.flushPendingUpdates(this.BATCH_COUNT), this.BATCH_INTERVAL);
    this.logger.log('CoinsService initialized with in-memory cache.');
  }

  onModuleDestroy() {
    clearInterval(this.intervalId);
    this.flushPendingUpdates(this.BATCH_COUNT);
    this.logger.log('CoinsService destroyed, flushing updates.');
  }

  async updateCoin(body: any): Promise<Partial<Users>> {
    try {
      let redisUsers: Users[] = (await this.cacheManager.get<Users[]>('users')) || [];

      const existingUserIndex = redisUsers.findIndex(user => user.id === body.id);
      if (existingUserIndex !== -1) {
        let redisUser = redisUsers[existingUserIndex]
        redisUsers[existingUserIndex].coins = body.coinCount ? redisUser.coins + body.coinCount : redisUser.coins;
        redisUsers[existingUserIndex].energy = body.energy ? body.energy : redisUser.energy;
        redisUsers[existingUserIndex].energyCapacity = body.energyCapacity ? body.energyCapacity : redisUser.energyCapacity;
        redisUsers[existingUserIndex].level = body.level ? body.level : redisUser.level;
        redisUsers[existingUserIndex].totalTaps = body.totalTaps ? body.totalTaps : redisUser.totalTaps;
        redisUsers[existingUserIndex].energyQuality = body.energyQuality ? body.energyQuality : redisUser.energyQuality;
        redisUsers[existingUserIndex].clickQuality = body.clickQuality ? body.clickQuality : redisUser.clickQuality;
        redisUsers[existingUserIndex].lastClickDate = new Date();

        let seconds = this.secondsPassedSince(redisUser.lastCalculatedEnergyDate)
        let energy = seconds > 0 ? redisUser.energy + seconds * redisUser.energyQuality : redisUser.energy
        redisUsers[existingUserIndex].energy = energy >= redisUser.energyCapacity ? redisUser.energyCapacity : energy
        redisUsers[existingUserIndex].lastCalculatedEnergyDate = new Date();

        await this.cacheManager.set('users', redisUsers);
        this.pendingUpdates[body.id] = redisUsers[existingUserIndex];
        return redisUsers[existingUserIndex];
      } else {

        let user = await this.userModel.findOne({ id: body.id }).exec();
        user.coins = body.coinCount ? body.coinCount + user.coins : user.coins;

        let seconds = this.secondsPassedSince(user.lastCalculatedEnergyDate)
        let energy = seconds > 0 ? user.energy + seconds * user.energyQuality : user.energy
        redisUsers[existingUserIndex].energy = energy >= user.energyCapacity ? user.energyCapacity : energy
        redisUsers[existingUserIndex].lastCalculatedEnergyDate = new Date();

        redisUsers.push(user.toObject());
        await this.cacheManager.set('users', redisUsers);
        this.pendingUpdates[body.id] = user.toObject()
        return user.toObject();
      }
    } catch (error) {
      this.logger.error(`Error updating coins for user ${body.id}: ${error.message}`);
      throw new Error(`Failed to update coins: ${error.message}`);
    }
  }

  async getUserDatas(body: any): Promise<Partial<Users>> {
    try {
      let redisUsers: Users[] = (await this.cacheManager.get<Users[]>('users')) || [];
      const existingUserIndex = redisUsers.findIndex(user => user.id === body.id);
      if (existingUserIndex !== -1) {
        let user = redisUsers[existingUserIndex]
        let seconds = this.secondsPassedSince(user.lastCalculatedEnergyDate)
        let energy = seconds > 0 ? user.energy + seconds * user.energyQuality : user.energy
        redisUsers[existingUserIndex].energy = energy >= user.energyCapacity ? user.energyCapacity : energy
        redisUsers[existingUserIndex].lastCalculatedEnergyDate = new Date()
        await this.cacheManager.set('users', redisUsers);
        return redisUsers[existingUserIndex];
      } else {
        let user = await this.userModel.findOne({ id: body.id });
        
        let seconds = this.secondsPassedSince(user.lastCalculatedEnergyDate)
        let energy = seconds > 0 ? user.energy + seconds * user.energyQuality : user.energy
        redisUsers[existingUserIndex].energy = energy >= user.energyCapacity ? user.energyCapacity : energy
        redisUsers[existingUserIndex].lastCalculatedEnergyDate = new Date()

        redisUsers.push(user.toObject());
        await this.cacheManager.set('users', redisUsers);
        this.pendingUpdates[body.id] = user.toObject()
        return user.toObject();
      }
    } catch (error) {
      this.logger.error(`Error updating coins for user ${body.id}: ${error.message}`);
      throw new Error(`Failed to update coins: ${error.message}`);
    }
  }

  async flushPendingUpdates(count: number) {
    try {
      this.BATCH_COUNT = count + 1
      if (this.BATCH_COUNT > 20) {
        await this.cacheManager.set('users', []);
        this.BATCH_COUNT = 1
      }
      if (Object.keys(this.pendingUpdates).length === 0) return;

      const bulkOps = Object.entries(this.pendingUpdates).map(([id, user]) => ({
        updateOne: {
          filter: { id: id },
          update: {
            coins: user.coins,
            level: user.level,
            energy: user.energy,
            energyCapacity: user.energyCapacity,
            totalTaps: user.totalTaps,
            energyQuality: user.energyQuality,
            clickQuality: user.clickQuality,
            lastClickDate: user.lastClickDate,
            lastCalculatedEnergyDate: user.lastCalculatedEnergyDate
          },
        },
      }));

      await this.userModel.bulkWrite(bulkOps);
      this.logger.log(`Flushed ${bulkOps.length} updates to MongoDB.`);

      let redisUsers: Users[] = (await this.cacheManager.get<Users[]>('users')) || [];

      for (const [id, user] of Object.entries(this.pendingUpdates)) {
        const userIndex = redisUsers.findIndex(user => user.id === id);
        if (userIndex !== -1) {
          redisUsers[userIndex] = user;
        } else {
          const dbUser = await this.userModel.findOne({ id: id }).exec();
          if (dbUser) {
            redisUsers.push(dbUser.toObject());
          }
        }
      }

      await this.cacheManager.set('users', redisUsers);
      this.pendingUpdates = {};
    } catch (error) {
      this.logger.error(`Error flushing updates: ${error.message}`);
    }
  }

    secondsPassedSince(givenDate: Date): number {
    const now = new Date(); // Hozirgi vaqt
    const timeDifference = now.getTime() - givenDate.getTime(); // Millisekundlarda farq
    const seconds = Math.floor(timeDifference / 1000); // Sekundlarga aylantirish
    return seconds;
  }

}
