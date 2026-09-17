import { NestFactory } from '@nestjs/core';
import { AppModule } from '../app.module';
import { UsersService } from '../users/users.service';
import { Role } from '../common/enums';
import * as crypto from 'crypto';

async function bootstrap() {
  const app = await NestFactory.createApplicationContext(AppModule);
  const usersService = app.get(UsersService);

  const email = process.env.INITIAL_ADMIN_EMAIL || process.argv[2] || 'admin@apexenterprise.com';
  const firstName = process.env.INITIAL_ADMIN_FIRSTNAME || process.argv[4] || 'Business';
  const lastName = process.env.INITIAL_ADMIN_LASTNAME || process.argv[5] || 'Owner';

  // In production, ensure no predictable default passwords
  let password = process.env.INITIAL_ADMIN_PASSWORD || process.argv[3];
  let isGenerated = false;

  if (!password) {
    password = crypto.randomBytes(8).toString('hex') + '!Aa1';
    isGenerated = true;
  }

  const existing = await usersService.findByEmail(email);
  if (existing) {
    console.log(`[Seed] User with email ${email} already exists. Skipping.`);
    await app.close();
    process.exit(0);
  }

  const user = await usersService.create({
    firstName,
    lastName,
    email,
    password,
    role: Role.OWNER,
  });

  console.log('====================================================');
  console.log('Initial Business Owner / Administrator Created:');
  console.log(`Email:    ${user.email}`);
  console.log(`Name:     ${user.firstName} ${user.lastName}`);
  console.log(`Role:     ${user.role}`);
  if (isGenerated) {
    console.log(`Password: ${password}`);
    console.log('IMPORTANT: Please save this password immediately and change it upon first login!');
  } else {
    console.log('Password: (Password specified via environment or arguments)');
  }
  console.log('====================================================');

  await app.close();
  process.exit(0);
}

bootstrap().catch((err) => {
  console.error('[Seed Error]:', err);
  process.exit(1);
});
