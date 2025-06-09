import { registerAs } from '@nestjs/config';

interface MongoConfigOptions {
  uri: string;
  db: string;
}

export const mongoConfig = registerAs(
  'mongo',
  (): MongoConfigOptions => ({
    uri: process.env.MONGO_URL,
    db: process.env.MONGO_DB,
  }),
);
