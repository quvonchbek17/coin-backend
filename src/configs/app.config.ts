import { registerAs } from '@nestjs/config';

interface AppConfigOptions {
  port: number;
}

export const appConfig = registerAs(
  'app',
  (): AppConfigOptions => ({
    port: process.env.PORT ? parseInt(process.env.PORT) : 3000,
  }),
);
