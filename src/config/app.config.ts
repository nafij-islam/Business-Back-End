import { registerAs } from '@nestjs/config';

export const appConfig = registerAs('app', () => ({
  nodeEnv: process.env.NODE_ENV || 'development',
  isProduction: process.env.NODE_ENV === 'production',
  port: parseInt(process.env.PORT || '5000', 10),
  frontendUrl: process.env.FRONTEND_URL || 'http://localhost:3000',
  corsOrigin: process.env.CORS_ORIGIN || process.env.FRONTEND_URL || 'http://localhost:3000',
  cookieDomain: process.env.COOKIE_DOMAIN || undefined,
  cookieSecure: process.env.COOKIE_SECURE === 'true' || process.env.NODE_ENV === 'production',
  logLevel: process.env.LOG_LEVEL || 'debug',
  jwt: {
    accessSecret: process.env.JWT_ACCESS_SECRET || 'default_dev_access_secret_12345',
    refreshSecret: process.env.JWT_REFRESH_SECRET || 'default_dev_refresh_secret_67890',
    accessExpiresIn: process.env.JWT_ACCESS_EXPIRES_IN || '15m',
    refreshExpiresIn: process.env.JWT_REFRESH_EXPIRES_IN || '7d',
  },
  throttle: {
    ttl: parseInt(process.env.THROTTLE_TTL || '60000', 10),
    limit: parseInt(process.env.THROTTLE_LIMIT || '120', 10),
  },
}));
