import { prisma } from './config/prisma.js';
import { hashPassword } from './utils/crypto.js';

async function seed() {
  console.log('🌱 Seeding clean production system roles, staff accounts, and default academic structure...');

  // 1. Create System Roles
  const roles = [
    'SUPER_ADMIN',
    'CENTRAL_ADMISSIONS', // Central Admissions Officer: Grants final admission across ALL schools
    'SCHOOL_ADMISSIONS',  // School Admissions Officer: Grants final admission for assigned school
    'CENTRAL_OFFICE',     // Central Office: Verifies certificates across ALL schools
    'OFFICE_USER',        // School Office: Verifies certificates ONLY for assigned school
    'CENTRAL_ACCOUNTS',   // Central Accounts: Clears fees across ALL schools
    'SCHOOL_ACCOUNTS',    // School Accounts: Clears fees ONLY for assigned school
    'SCHOOL_ADMIN',       // School Admin: Form & Doc Builder + Student Roster for assigned school
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

  // 2. Staff Accounts
  const superAdminRole = await prisma.role.findUnique({ where: { name: 'SUPER_ADMIN' } });
  if (superAdminRole) {
    await prisma.user.upsert({
      where: { email: 'admin@gvpihlr.edu.in' },
      update: {},
      create: { email: 'admin@gvpihlr.edu.in', passwordHash: passHash, mustChangePassword: false, roleId: superAdminRole.id },
    });
  }

  const centralAdmissionsRole = await prisma.role.findUnique({ where: { name: 'CENTRAL_ADMISSIONS' } });
  if (centralAdmissionsRole) {
    await prisma.user.upsert({
      where: { email: 'admissions@gvpihlr.edu.in' },
      update: {},
      create: { email: 'admissions@gvpihlr.edu.in', passwordHash: passHash, mustChangePassword: false, roleId: centralAdmissionsRole.id },
    });
  }

  const schoolAdmissionsRole = await prisma.role.findUnique({ where: { name: 'SCHOOL_ADMISSIONS' } });
  if (schoolAdmissionsRole) {
    await prisma.user.upsert({
      where: { email: 'school.admissions@gvpihlr.edu.in' },
      update: {},
      create: { email: 'school.admissions@gvpihlr.edu.in', passwordHash: passHash, mustChangePassword: false, roleId: schoolAdmissionsRole.id },
    });
  }

  const centralOfficeRole = await prisma.role.findUnique({ where: { name: 'CENTRAL_OFFICE' } });
  if (centralOfficeRole) {
    await prisma.user.upsert({
      where: { email: 'central.office@gvpihlr.edu.in' },
      update: {},
      create: { email: 'central.office@gvpihlr.edu.in', passwordHash: officePassHash, mustChangePassword: false, roleId: centralOfficeRole.id },
    });
  }

  const officeRole = await prisma.role.findUnique({ where: { name: 'OFFICE_USER' } });
  if (officeRole) {
    await prisma.user.upsert({
      where: { email: 'office@gvpihlr.edu.in' },
      update: {},
      create: { email: 'office@gvpihlr.edu.in', passwordHash: officePassHash, mustChangePassword: false, roleId: officeRole.id },
    });
  }

  const centralAccountsRole = await prisma.role.findUnique({ where: { name: 'CENTRAL_ACCOUNTS' } });
  if (centralAccountsRole) {
    await prisma.user.upsert({
      where: { email: 'accounts@gvpihlr.edu.in' },
      update: {},
      create: { email: 'accounts@gvpihlr.edu.in', passwordHash: accountsPassHash, mustChangePassword: false, roleId: centralAccountsRole.id },
    });
  }

  const schoolAccountsRole = await prisma.role.findUnique({ where: { name: 'SCHOOL_ACCOUNTS' } });
  if (schoolAccountsRole) {
    await prisma.user.upsert({
      where: { email: 'school.accounts@gvpihlr.edu.in' },
      update: {},
      create: { email: 'school.accounts@gvpihlr.edu.in', passwordHash: accountsPassHash, mustChangePassword: false, roleId: schoolAccountsRole.id },
    });
  }

  const schoolAdminRole = await prisma.role.findUnique({ where: { name: 'SCHOOL_ADMIN' } });
  if (schoolAdminRole) {
    await prisma.user.upsert({
      where: { email: 'school.admin@gvpihlr.edu.in' },
      update: {},
      create: { email: 'school.admin@gvpihlr.edu.in', passwordHash: passHash, mustChangePassword: false, roleId: schoolAdminRole.id },
    });
  }

  // 3. Seed Default School Structure (School of Engineering & B.Tech CSE)
  const engSchool = await prisma.school.upsert({
    where: { code: 'ENGG' },
    update: {},
    create: { name: 'School of Engineering', code: 'ENGG' },
  });

  const cseProg = await prisma.program.upsert({
    where: { schoolId_code: { schoolId: engSchool.id, code: 'CSE' } },
    update: {},
    create: {
      schoolId: engSchool.id,
      name: 'B.Tech Computer Science and Engineering',
      code: 'CSE',
      studentIdPrefix: 'GVPCSE',
      applicationFee: 1500,
    },
  });

  const existingCycle = await prisma.admissionCycle.findFirst({
    where: { programId: cseProg.id, academicYear: 2026 },
  });

  if (!existingCycle) {
    await prisma.admissionCycle.create({
      data: { academicYear: 2026, title: '2026 Phase 1', programId: cseProg.id, isActive: true },
    });
  }

  console.log('✅ Clean staff accounts and initial academic cycle seeded successfully. (0 student accounts)');
}

seed()
  .catch((e) => {
    console.error('Seeding error:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
