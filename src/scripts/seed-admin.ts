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
  const password = process.env.INITIAL_ADMIN_PASSWORD || process.argv[3] || 'Admin@123456';

  const existing = await usersService.findByEmail(email);
  if (existing) {
    const bcrypt = await import('bcrypt');
    const newHash = await bcrypt.hash(password, 12);
    await usersService.updatePassword(existing._id.toString(), newHash);
    console.log('====================================================');
    console.log(`[Seed] User with email ${email} already existed.`);
    console.log(`Password reset to: ${password}`);
    console.log('====================================================');
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
  console.log(`Password: ${password}`);
  console.log('IMPORTANT: Please save this password immediately and change it upon first login!');
  console.log('====================================================');

  await app.close();
  process.exit(0);
}

bootstrap().catch((err) => {
  console.error('[Seed Error]:', err);
  process.exit(1);
});
