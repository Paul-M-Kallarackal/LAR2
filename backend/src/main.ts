import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { AppModule } from './app.module';
import { User, UserRole } from './database/entities/user.entity';
import { DataSource } from 'typeorm';
import * as bcrypt from 'bcryptjs';

const DEFAULT_USERS = [
  {
    id: '00000000-0000-0000-0000-000000000001',
    email: 'provider@lma.eu',
    password: 'password123',
    name: 'Loan Provider',
    role: UserRole.PROVIDER,
    avatarUrl: 'https://api.dicebear.com/7.x/initials/svg?seed=LP',
  },
  {
    id: '00000000-0000-0000-0000-000000000002',
    email: 'borrower@lma.eu',
    password: 'password123',
    name: 'Loan Borrower',
    role: UserRole.BORROWER,
    avatarUrl: 'https://api.dicebear.com/7.x/initials/svg?seed=LB',
  },
];

async function seedUsers(dataSource: DataSource) {
  const userRepository = dataSource.getRepository(User);

  for (const userData of DEFAULT_USERS) {
    try {
      let existingUser = await userRepository.findOne({ where: { email: userData.email } });
      const passwordHash = await bcrypt.hash(userData.password, 10);

      if (existingUser) {
        existingUser.passwordHash = passwordHash;
        existingUser.name = userData.name;
        existingUser.role = userData.role;
        existingUser.avatarUrl = userData.avatarUrl;
        await userRepository.save(existingUser);
        console.log(`✓ User ${userData.email} (${userData.role}) password updated`);
      } else {
        const newUser = userRepository.create({
          id: userData.id,
          email: userData.email,
          passwordHash,
          name: userData.name,
          role: userData.role,
          avatarUrl: userData.avatarUrl,
        });
        await userRepository.save(newUser);
        console.log(`✓ User ${userData.email} (${userData.role}) created`);
      }
    } catch (error: any) {
      console.error(`✗ Failed to seed user ${userData.email}:`, error.message);
      if (error.stack) {
        console.error(error.stack);
      }
    }
  }
}

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  app.enableCors({
    origin: process.env.FRONTEND_URL || 'http://localhost:5173',
    credentials: true,
  });

  app.useGlobalPipes(new ValidationPipe({
    whitelist: true,
    transform: true,
  }));

  app.setGlobalPrefix('api');

  const dataSource = app.get(DataSource);
  await seedUsers(dataSource);

  const port = process.env.PORT || 3000;
  await app.listen(port);
  console.log(`Application running on port ${port}`);
}

bootstrap();
