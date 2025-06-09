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
import { UsersService } from 'modules/users/users.service';

@Injectable()
export class CoinsService implements OnModuleInit, OnModuleDestroy {
  private readonly BATCH_INTERVAL = 5000;
  private BATCH_COUNT: number = 1;
  private readonly CLEAR_INTERVAL = 1000 * 60 * 2;
  private pendingUpdates: { [userId: string]: Users } = {};
  private intervalId: NodeJS.Timeout;
  private readonly logger = new Logger(CoinsService.name);

  constructor(
    @InjectModel(Users.name) private userModel: Model<usersDocument>,
    @Inject(CACHE_MANAGER) private cacheManager: Cache,
    private readonly usersService: UsersService,
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

      const existingUserIndex = redisUsers.findIndex(user => user.id === body.userId);
      if (existingUserIndex !== -1) {
        redisUsers[existingUserIndex].coins += body.coinCount;
        redisUsers[existingUserIndex].energy = body.energy;
        redisUsers[existingUserIndex].energyCapacity = body.energyCapacity;
        redisUsers[existingUserIndex].level = body.level;
        redisUsers[existingUserIndex].totalTaps = body.totalTaps;
        redisUsers[existingUserIndex].energyQuality = body.energyQuality;
        redisUsers[existingUserIndex].clickQuality = body.clickQuality;
        redisUsers[existingUserIndex].lastClickDate = new Date();
        redisUsers[existingUserIndex].lastCalculatedEnergyDate = new Date();
        await this.cacheManager.set('users', redisUsers);
        this.pendingUpdates[body.userId] = redisUsers[existingUserIndex];
        return redisUsers[existingUserIndex];
      } else {

        let user = await this.userModel.findOne({ id: body.userId }).exec();
        if (!user) {
          user = new this.userModel({ id: body.userId, coins: 0 });
        }
        user.coins += body.coinCount;
        redisUsers.push(user.toObject());
        await this.cacheManager.set('users', redisUsers);
        this.pendingUpdates[body.userId] = user.toObject()
        return user.toObject();
      }
    } catch (error) {
      this.logger.error(`Error updating coins for user ${body.userId}: ${error.message}`);
      throw new Error(`Failed to update coins: ${error.message}`);
    }
  }

    async getUserDatas(body: any): Promise<Partial<Users>> {
    try {
      let redisUsers: Users[] = (await this.cacheManager.get<Users[]>('users')) || [];
      const existingUserIndex = redisUsers.findIndex(user => user.id === body.id);
      if (existingUserIndex !== -1) {
      let user = redisUsers[existingUserIndex]
      let seconds = this.usersService.secondsPassedSince(user.lastCalculatedEnergyDate)
      let energy = seconds > 0 ? user.energy + seconds * user.energyQuality: user.energy
      redisUsers[existingUserIndex].energy = energy >= user.energyCapacity ? user.energyCapacity: energy
      redisUsers[existingUserIndex].lastCalculatedEnergyDate = new Date()
      await this.cacheManager.set('users', redisUsers);
      return redisUsers[existingUserIndex];
      } else {
        let user = await this.userModel.findOne({ id: body.id });
        redisUsers.push(user.toObject());
        await this.cacheManager.set('users', redisUsers);
        this.pendingUpdates[body.userId] = user.toObject()
        return user.toObject();
      }
    } catch (error) {
      this.logger.error(`Error updating coins for user ${body.userId}: ${error.message}`);
      throw new Error(`Failed to update coins: ${error.message}`);
    }
  }

  // async updateEnergy(body: any): Promise<Partial<Users>> {
  //   try {
  //     let redisUsers: Users[] = (await this.cacheManager.get<Users[]>('users')) || [];

  //     const existingUserIndex = redisUsers.findIndex(user => user.id === body.userId);
  //     if (existingUserIndex !== -1) {
  //       redisUsers[existingUserIndex].energy = redisUsers[existingUserIndex].energy >= redisUsers[existingUserIndex].energyCapacity? redisUsers[existingUserIndex].energyCapacity: body.energy;
  //       redisUsers[existingUserIndex].lastCalculatedEnergyDate = new Date();
  //       await this.cacheManager.set('users', redisUsers);
  //       this.pendingUpdates[body.userId] = redisUsers[existingUserIndex];
  //       return redisUsers[existingUserIndex];
  //     } else {
  //       let user = await this.userModel.findOne({ id: body.userId }).exec();
  //       if (!user) {
  //         user = new this.userModel({ id: body.userId, coins: 0 });
  //       }
  //       user.energy = body.energy;
  //       redisUsers.push(user.toObject());
  //       await this.cacheManager.set('users', redisUsers);
  //       this.pendingUpdates[body.userId] = user.toObject()
  //       return user.toObject();
  //     }
  //   } catch (error) {
  //     this.logger.error(`Error updating coins for user ${body.userId}: ${error.message}`);
  //     throw new Error(`Failed to update coins: ${error.message}`);
  //   }
  // }

  async flushPendingUpdates(count: number) {
    try {
      this.BATCH_COUNT = count  + 1
      if(this.BATCH_COUNT > 20){
        await this.cacheManager.set('users', []);
        this.BATCH_COUNT = 1
      }
      if (Object.keys(this.pendingUpdates).length === 0) return;



      const bulkOps = Object.entries(this.pendingUpdates).map(([userId, user]) => ({
        updateOne: {
          filter: { id: userId },
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

      for (const [userId, user] of Object.entries(this.pendingUpdates)) {
        const userIndex = redisUsers.findIndex(user => user.id === userId);
        if (userIndex !== -1) {
          redisUsers[userIndex] = user;
        } else {
          const dbUser = await this.userModel.findOne({ id: userId }).exec();
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

  async getUserCoins(userId: string): Promise<{ userId: string; totalCoins: number }> {
    try {
      let redisUsers: Users[] = (await this.cacheManager.get<Users[]>('users')) || [];
      const cachedUser = redisUsers.find(user => user.id === userId);
      if (cachedUser) {
        return { userId, totalCoins: cachedUser.coins };
      }

      const user = await this.userModel.findOne({ id: userId }).exec();
      const totalCoins = user ? user.coins : 0;

      if (user) {
        redisUsers.push(user.toObject());
        await this.cacheManager.set('users', redisUsers);
      }

      return { userId, totalCoins };
    } catch (error) {
      this.logger.error(`Error getting coins for user ${userId}: ${error.message}`);
      throw new Error(`Failed to get coins: ${error.message}`);
    }
  }
}
