import { prisma } from './config/prisma.js';
import { hashPassword, encryptAadhaar } from './utils/crypto.js';

async function seed() {
  console.log('🌱 Seeding clean production-ready system roles, staff accounts, schools, and sample students...');

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
  const studentPassHash = await hashPassword('6fdc3a6e9c!2026');

  const studentRole = await prisma.role.findUnique({ where: { name: 'STUDENT' } });

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

  // 3. Seed Schools & Programs
  const engSchool = await prisma.school.upsert({
    where: { code: 'ENGG' },
    update: {},
    create: { name: 'School of Engineering', code: 'ENGG' },
  });

  const mgmtSchool = await prisma.school.upsert({
    where: { code: 'MGMT' },
    update: {},
    create: { name: 'School of Management', code: 'MGMT' },
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

  const eceProg = await prisma.program.upsert({
    where: { schoolId_code: { schoolId: engSchool.id, code: 'ECE' } },
    update: {},
    create: {
      schoolId: engSchool.id,
      name: 'B.Tech Electronics & Communication',
      code: 'ECE',
      studentIdPrefix: 'GVPECE',
      applicationFee: 1500,
    },
  });

  const mbaProg = await prisma.program.upsert({
    where: { schoolId_code: { schoolId: mgmtSchool.id, code: 'MBA' } },
    update: {},
    create: {
      schoolId: mgmtSchool.id,
      name: 'MBA Business Analytics',
      code: 'MBA',
      studentIdPrefix: 'GVPMBA',
      applicationFee: 2000,
    },
  });

  const cseCycle = await prisma.admissionCycle.create({
    data: { academicYear: 2026, title: '2026 Phase 1', programId: cseProg.id, isActive: true },
  });

  const eceCycle = await prisma.admissionCycle.create({
    data: { academicYear: 2026, title: '2026 Phase 1', programId: eceProg.id, isActive: true },
  });

  const mbaCycle = await prisma.admissionCycle.create({
    data: { academicYear: 2026, title: '2026 Phase 1', programId: mbaProg.id, isActive: true },
  });

  // 4. SEED SAMPLE STUDENT: Saran Neralla (GVPCSE2026-001) - DOCUMENTS_VERIFIED & FEE_CLEARED (Ready for Admissions Grant!)
  if (studentRole) {
    const saranUser = await prisma.user.create({
      data: {
        email: 'saran.neralla@gmail.com',
        passwordHash: studentPassHash,
        roleId: studentRole.id,
        mustChangePassword: false,
      },
    });

    const saranStudent = await prisma.student.create({
      data: {
        studentId: 'GVPCSE2026-001',
        encryptedAadhaar: encryptAadhaar('123456789012'),
        aadhaarLast4: '9012',
        fullName: 'Saran Neralla',
        gender: 'MALE',
        dateOfBirth: new Date('2004-05-15'),
        userId: saranUser.id,
        programId: cseProg.id,
      },
    });

    const saranApp = await prisma.application.create({
      data: {
        applicationNo: 'APP-GVPCSE2026-001',
        studentId: saranStudent.id,
        admissionCycleId: cseCycle.id,
        status: 'FEE_CLEARED',
        dynamicFormData: JSON.stringify({
          fatherName: 'Ram Neralla',
          motherName: 'Latha Neralla',
          address: 'Gayatri Vidya Parishad Campus, Visakhapatnam',
          twelfthPercentage: '95.4%',
        }),
      },
    });

    // Add verified documents for Saran Neralla
    const docs = [
      { type: '10TH_MARKS_CARD', path: '10TH_MARKS_CARD.pdf' },
      { type: '12TH_MARKS_CARD', path: '12TH_MARKS_CARD.pdf' },
      { type: 'AADHAAR_CARD', path: 'AADHAAR_CARD.pdf' },
    ];

    for (const d of docs) {
      const sDoc = await prisma.studentDocument.create({
        data: {
          applicationId: saranApp.id,
          documentType: d.type,
          filePath: d.path,
          status: 'VERIFIED',
          remarks: 'Verified by Office',
        },
      });

      await prisma.documentVersion.create({
        data: {
          studentDocumentId: sDoc.id,
          versionNumber: 1,
          filePath: d.path,
        },
      });
    }

    // Add verified fee record for Saran Neralla
    await prisma.feeRecord.create({
      data: {
        applicationId: saranApp.id,
        amountPaid: 50000,
        transactionRefNo: 'TXN-GVP-2026-88492',
        receiptFilePath: 'FEE_RECEIPT.pdf',
        status: 'VERIFIED',
        remarks: 'Cleared by Accounts Office',
      },
    });

    // 5. SAMPLE STUDENT 2: Ananya Sharma (GVPMBA2026-001) - VERIFICATION_PENDING (Appears on /verification)
    const ananyaUser = await prisma.user.create({
      data: {
        email: 'ananya.sharma@gmail.com',
        passwordHash: studentPassHash,
        roleId: studentRole.id,
        mustChangePassword: false,
      },
    });

    const ananyaStudent = await prisma.student.create({
      data: {
        studentId: 'GVPMBA2026-001',
        encryptedAadhaar: encryptAadhaar('987654321098'),
        aadhaarLast4: '1098',
        fullName: 'Ananya Sharma',
        gender: 'FEMALE',
        dateOfBirth: new Date('2003-08-20'),
        userId: ananyaUser.id,
        programId: mbaProg.id,
      },
    });

    const ananyaApp = await prisma.application.create({
      data: {
        applicationNo: 'APP-GVPMBA2026-001',
        studentId: ananyaStudent.id,
        admissionCycleId: mbaCycle.id,
        status: 'VERIFICATION_PENDING',
        dynamicFormData: JSON.stringify({ fatherName: 'Sanjay Sharma', graduationCGPA: '8.9' }),
      },
    });

    const aDoc = await prisma.studentDocument.create({
      data: { applicationId: ananyaApp.id, documentType: 'DEGREE_CERTIFICATE', filePath: 'DEGREE_CERTIFICATE.pdf', status: 'UPLOADED' },
    });
    await prisma.documentVersion.create({ data: { studentDocumentId: aDoc.id, versionNumber: 1, filePath: 'DEGREE_CERTIFICATE.pdf' } });

    // 6. SAMPLE STUDENT 3: Rahul Verma (GVPCSE2026-002) - CORRECTION_REQUIRED (Appears on /verification/reupload)
    const rahulUser = await prisma.user.create({
      data: {
        email: 'rahul.verma@gmail.com',
        passwordHash: studentPassHash,
        roleId: studentRole.id,
        mustChangePassword: false,
      },
    });

    const rahulStudent = await prisma.student.create({
      data: {
        studentId: 'GVPCSE2026-002',
        encryptedAadhaar: encryptAadhaar('554433221100'),
        aadhaarLast4: '1100',
        fullName: 'Rahul Verma',
        gender: 'MALE',
        dateOfBirth: new Date('2004-11-02'),
        userId: rahulUser.id,
        programId: cseProg.id,
      },
    });

    const rahulApp = await prisma.application.create({
      data: {
        applicationNo: 'APP-GVPCSE2026-002',
        studentId: rahulStudent.id,
        admissionCycleId: cseCycle.id,
        status: 'CORRECTION_REQUIRED',
      },
    });

    const rDoc = await prisma.studentDocument.create({
      data: {
        applicationId: rahulApp.id,
        documentType: '10TH_MARKS_CARD',
        filePath: '10TH_MARKS_CARD.pdf',
        status: 'CORRECTION_REQUIRED',
        remarks: 'Scan is blurry, please re-upload clear original.',
      },
    });
    await prisma.documentVersion.create({ data: { studentDocumentId: rDoc.id, versionNumber: 1, filePath: '10TH_MARKS_CARD.pdf' } });

    // 7. SAMPLE STUDENT 4: Priya Patel (GVPECE2026-001) - FEE_PENDING (Appears on /finance)
    const priyaUser = await prisma.user.create({
      data: {
        email: 'priya.patel@gmail.com',
        passwordHash: studentPassHash,
        roleId: studentRole.id,
        mustChangePassword: false,
      },
    });

    const priyaStudent = await prisma.student.create({
      data: {
        studentId: 'GVPECE2026-001',
        encryptedAadhaar: encryptAadhaar('112233445566'),
        aadhaarLast4: '5566',
        fullName: 'Priya Patel',
        gender: 'FEMALE',
        dateOfBirth: new Date('2004-03-10'),
        userId: priyaUser.id,
        programId: eceProg.id,
      },
    });

    const priyaApp = await prisma.application.create({
      data: {
        applicationNo: 'APP-GVPECE2026-001',
        studentId: priyaStudent.id,
        admissionCycleId: eceCycle.id,
        status: 'FEE_PENDING',
      },
    });

    await prisma.feeRecord.create({
      data: {
        applicationId: priyaApp.id,
        amountPaid: 45000,
        transactionRefNo: 'TXN-ECE-99381',
        receiptFilePath: 'ECE_FEE_RECEIPT.pdf',
        status: 'PENDING_VERIFICATION',
      },
    });

    // 8. SAMPLE STUDENT 5: Vikram Reddy (GVPCSE2026-003) - ADMITTED (Appears on /admissions/approved)
    const vikramUser = await prisma.user.create({
      data: {
        email: 'vikram.reddy@gmail.com',
        passwordHash: studentPassHash,
        roleId: studentRole.id,
        mustChangePassword: false,
      },
    });

    const vikramStudent = await prisma.student.create({
      data: {
        studentId: 'GVPCSE2026-003',
        encryptedAadhaar: encryptAadhaar('667788990011'),
        aadhaarLast4: '0011',
        fullName: 'Vikram Reddy',
        gender: 'MALE',
        dateOfBirth: new Date('2004-01-25'),
        userId: vikramUser.id,
        programId: cseProg.id,
      },
    });

    await prisma.application.create({
      data: {
        applicationNo: 'APP-GVPCSE2026-003',
        studentId: vikramStudent.id,
        admissionCycleId: cseCycle.id,
        status: 'ADMITTED',
      },
    });
  }

  console.log('✅ Clean staff accounts, schools, and sample student records seeded successfully.');
}

seed()
  .catch((e) => {
    console.error('Seeding error:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
