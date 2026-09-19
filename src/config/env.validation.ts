import { plainToInstance } from 'class-transformer';
import { IsEnum, IsNumber, IsOptional, IsString, validateSync } from 'class-validator';

enum Environment {
  Development = 'development',
  Production = 'production',
  Test = 'test',
}

export class EnvironmentVariables {
  @IsEnum(Environment)
  @IsOptional()
  NODE_ENV: Environment = Environment.Development;

  @IsNumber()
  @IsOptional()
  PORT: number = 5000;

  @IsString()
  @IsOptional()
  MONGODB_URI: string = 'mongodb://127.0.0.1:27017/business_inventory';

  @IsString()
  @IsOptional()
  FRONTEND_URL: string = 'http://localhost:3000';

  @IsString()
  JWT_ACCESS_SECRET: string = 'default_dev_access_secret_12345';

  @IsString()
  JWT_REFRESH_SECRET: string = 'default_dev_refresh_secret_67890';

  @IsString()
  @IsOptional()
  JWT_ACCESS_EXPIRES_IN: string = '15m';

  @IsString()
  @IsOptional()
  JWT_REFRESH_EXPIRES_IN: string = '7d';

  @IsString()
  @IsOptional()
  COOKIE_DOMAIN?: string;

  @IsString()
  @IsOptional()
  COOKIE_SECURE: string = 'false';

  @IsString()
  @IsOptional()
  CORS_ORIGIN: string = 'http://localhost:3000';

  @IsString()
  @IsOptional()
  LOG_LEVEL: string = 'debug';

  @IsNumber()
  @IsOptional()
  THROTTLE_TTL: number = 60000;

  @IsNumber()
  @IsOptional()
  THROTTLE_LIMIT: number = 120;
}

export function validateEnvironment(config: Record<string, unknown>) {
  const validatedConfig = plainToInstance(EnvironmentVariables, config, {
    enableImplicitConversion: true,
  });

  const errors = validateSync(validatedConfig, { skipMissingProperties: false });

  if (errors.length > 0) {
    throw new Error(`Environment validation failed: ${errors.toString()}`);
  }

  // Security Hardening: Enforce production secrets
  if (validatedConfig.NODE_ENV === Environment.Production) {
    if (
      !validatedConfig.JWT_ACCESS_SECRET ||
      validatedConfig.JWT_ACCESS_SECRET.includes('default_dev') ||
      validatedConfig.JWT_ACCESS_SECRET.length < 16
    ) {
      throw new Error(
        'Production startup rejected: JWT_ACCESS_SECRET must be set to a secure, random string (min 16 chars).',
      );
    }

    if (
      !validatedConfig.JWT_REFRESH_SECRET ||
      validatedConfig.JWT_REFRESH_SECRET.includes('default_dev') ||
      validatedConfig.JWT_REFRESH_SECRET.length < 16
    ) {
      throw new Error(
        'Production startup rejected: JWT_REFRESH_SECRET must be set to a secure, random string (min 16 chars).',
      );
    }

    if (
      !validatedConfig.MONGODB_URI ||
      validatedConfig.MONGODB_URI.includes('127.0.0.1') ||
      validatedConfig.MONGODB_URI.includes('localhost')
    ) {
      throw new Error(
        'Production startup rejected: MONGODB_URI must be configured with a production database URI.',
      );
    }
  }

  return validatedConfig;
}
