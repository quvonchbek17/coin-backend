import { registerAs } from '@nestjs/config';

interface MongoConfigOptions {
  uri: string;
  db: string;
}

export const mongoConfig = registerAs(
  'mongo',
  (): MongoConfigOptions => ({
    uri: process.env.MONGO_URL || 'mongodb://127.0.0.1:27017',
    db: process.env.MONGO_DB || 'coin',
  }),
);
