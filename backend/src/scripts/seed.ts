import { AppRole, PrismaClient } from '@prisma/client';
import { hashPassword } from '../lib/password.js';

const prisma = new PrismaClient();

const seedAccounts = [
  {
    email: 'superadmin@viralkaro.local',
    name: 'Viralkaro Superadmin',
    password: 'SuperAdmin@123',
    roles: [AppRole.superadmin],
  },
  {
    email: 'admin@viralkaro.local',
    name: 'Viralkaro Admin',
    password: 'Admin@12345',
    roles: [AppRole.admin],
  },
] as const;

const run = async () => {
  for (const account of seedAccounts) {
    const passwordHash = await hashPassword(account.password);

    const user = await prisma.user.upsert({
      where: { email: account.email },
      update: {
        name: account.name,
        passwordHash,
        accountStatus: 'active',
      },
      create: {
        email: account.email,
        name: account.name,
        passwordHash,
      },
    });

    await prisma.userRole.deleteMany({
      where: { userId: user.id },
    });

    await prisma.userRole.createMany({
      data: account.roles.map(role => ({
        userId: user.id,
        role,
      })),
    });
  }

  console.log('Seeded accounts:');
  for (const account of seedAccounts) {
    console.log(`- ${account.email} / ${account.password} (${account.roles.join(', ')})`);
  }
};

run()
  .catch(error => {
    console.error('Seed failed', error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
