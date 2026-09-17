import { registerAs } from '@nestjs/config';

export const databaseConfig = registerAs('database', () => ({
  uri: process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/business_inventory',
  autoIndex: process.env.NODE_ENV !== 'production',
}));
