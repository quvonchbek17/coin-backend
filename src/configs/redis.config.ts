import { registerAs } from '@nestjs/config';

interface RedisConfigOptions {
  host: string;
  port: number;
}

export const redisConfig = registerAs(
  'redis',
  (): RedisConfigOptions => ({
    host: process.env.REDIS_HOST || '127.0.0.1',
    port: parseInt(process.env.REDIS_PORT) || 6379,
  }),
);
