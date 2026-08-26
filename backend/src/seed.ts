import { prisma } from './config/prisma.js';
import { hashPassword } from './utils/crypto.js';

async function seed() {
  console.log('🌱 Seeding clean production-ready system roles and staff accounts...');

  // 1. Create System Roles
  const roles = [
    'SUPER_ADMIN',
    'SCHOOL_ADMIN',
    'OFFICE_USER',       // School Office: Creates Students + Verifies Certificates
    'CENTRAL_ACCOUNTS',  // Central Accounts: Checks & clears fee transactions across all schools
    'DEPARTMENT_USER',
    'STUDENT',
  ];

  for (const roleName of roles) {
    await prisma.role.upsert({
      where: { name: roleName },
      update: {},
      create: {
        name: roleName,
        permissions: JSON.stringify(['*']),
      },
    });
  }
  console.log('✅ System roles seeded.');

  const passHash = await hashPassword('Admin@2026');
  const officePassHash = await hashPassword('Office@2026');
  const accountsPassHash = await hashPassword('Accounts@2026');

  // 2. Super Admin Account
  const superAdminRole = await prisma.role.findUnique({ where: { name: 'SUPER_ADMIN' } });
  if (superAdminRole) {
    await prisma.user.upsert({
      where: { email: 'admin@gvpihlr.edu.in' },
      update: {},
      create: {
        email: 'admin@gvpihlr.edu.in',
        passwordHash: passHash,
        mustChangePassword: false,
        roleId: superAdminRole.id,
      },
    });
  }

  // 3. School Admin Account
  const schoolAdminRole = await prisma.role.findUnique({ where: { name: 'SCHOOL_ADMIN' } });
  if (schoolAdminRole) {
    await prisma.user.upsert({
      where: { email: 'school.admin@gvpihlr.edu.in' },
      update: {},
      create: {
        email: 'school.admin@gvpihlr.edu.in',
        passwordHash: passHash,
        mustChangePassword: false,
        roleId: schoolAdminRole.id,
      },
    });
  }

  // 4. Office User Account
  const officeRole = await prisma.role.findUnique({ where: { name: 'OFFICE_USER' } });
  if (officeRole) {
    await prisma.user.upsert({
      where: { email: 'office@gvpihlr.edu.in' },
      update: {},
      create: {
        email: 'office@gvpihlr.edu.in',
        passwordHash: officePassHash,
        mustChangePassword: false,
        roleId: officeRole.id,
      },
    });
  }

  // 5. Central Accounts Account
  const centralAccountsRole = await prisma.role.findUnique({ where: { name: 'CENTRAL_ACCOUNTS' } });
  if (centralAccountsRole) {
    await prisma.user.upsert({
      where: { email: 'accounts@gvpihlr.edu.in' },
      update: {},
      create: {
        email: 'accounts@gvpihlr.edu.in',
        passwordHash: accountsPassHash,
        mustChangePassword: false,
        roleId: centralAccountsRole.id,
      },
    });
  }

  console.log('✅ Clean staff accounts seeded successfully (no default schools/programs).');
  console.log('🚀 Ready for scratch setup by Admin!');
}

seed()
  .catch((e) => {
    console.error('Seeding error:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
