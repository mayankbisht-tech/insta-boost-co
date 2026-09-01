import './backend/src/config/env.js';
import { prisma } from './backend/src/lib/prisma.js';
import { hashPassword } from './backend/src/lib/password.js';
import { generateUniqueUsername } from './backend/src/lib/username.js';

declare const process: any;

const usersToSeed = [
  {
    email: 'superadmin@viralkaro.local',
    name: 'Viralkaro Superadmin',
    password: 'SuperAdmin@123',
    roles: ['superadmin' as const],
  },
  {
    email: 'admin@viralkaro.local',
    name: 'Viralkaro Admin',
    password: 'Admin@12345',
    roles: ['admin' as const],
  },
  {
    email: 'manager@viralkaro.local',
    name: 'Viralkaro Manager',
    password: 'Admin@23456',
    roles: ['admin' as const],
  },
  {
    email: 'moderator@viralkaro.local',
    name: 'Viralkaro Moderator',
    password: 'Admin@34567',
    roles: ['admin' as const],
  },
  {
    email: 'operator@viralkaro.local',
    name: 'Viralkaro Operator',
    password: 'Admin@45678',
    roles: ['admin' as const],
  },
  {
    email: 'creator@viralkaro.local',
    name: 'Viralkaro Creator',
    password: 'Creator@123',
    roles: ['user' as const],
  },
  {
    email: 'user1@viralkaro.local',
    name: 'Viralkaro User One',
    password: 'User@12345',
    roles: ['user' as const],
  },
  {
    email: 'user2@viralkaro.local',
    name: 'Viralkaro User Two',
    password: 'User@23456',
    roles: ['user' as const],
  },
  {
    email: 'user3@viralkaro.local',
    name: 'Viralkaro User Three',
    password: 'User@34567',
    roles: ['user' as const],
  },
];

async function seed() {
  console.log('Starting database seeding...');
  let createdCount = 0;
  let skippedCount = 0;

  for (const userData of usersToSeed) {
    const existingUser = await prisma.user.findUnique({
      where: { email: userData.email },
    });

    if (existingUser) {
      console.log(`User ${userData.email} already exists. Skipping.`);
      skippedCount++;
      continue;
    }

    const passwordHash = await hashPassword(userData.password);

    await prisma.$transaction(async (tx: any) => {
      const username = await generateUniqueUsername(tx, {
        name: userData.name,
        email: userData.email,
      });

      const createdUser = await tx.user.create({
        data: {
          email: userData.email,
          name: userData.name,
          passwordHash,
          username,
          accountStatus: 'active',
        },
      });

      for (const role of userData.roles) {
        await tx.userRole.create({
          data: {
            userId: createdUser.id,
            role,
          },
        });
      }
    });

    console.log(`Created user ${userData.email} with roles: ${userData.roles.join(', ')}`);
    createdCount++;
  }

  console.log(`Seeding finished. Created: ${createdCount}, Skipped: ${skippedCount}`);
}

seed()
  .catch((error) => {
    console.error('Seeding failed:', error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
