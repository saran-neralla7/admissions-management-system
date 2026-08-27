import { Router } from 'express';
import multer from 'multer';
import path from 'path';
import {
  login,
  logout,
  changePassword,
  getMe,
} from '../controllers/authController.js';
import {
  getUsers,
  createUser,
  updateUser,
  deleteUser,
  getRoles,
} from '../controllers/userController.js';
import {
  getSchools,
  createSchool,
  updateSchool,
  deleteSchool,
  createProgram,
  updateProgram,
  deleteProgram,
  getAdmissionCycles,
  createAdmissionCycle,
  updateAdmissionCycle,
  deleteAdmissionCycle,
} from '../controllers/academicController.js';
import {
  getProgramFormSchema,
  updateProgramFormSchema,
  cloneProgramFormSchema,
} from '../controllers/formBuilderController.js';
import {
  createStudent,
  getStudents,
  unmaskAadhaar,
  resetStudentPassword,
  admitStudent,
  requestReverification,
} from '../controllers/studentController.js';
import {
  getMyApplication,
  updateApplicationDraft,
  submitApplication,
  updateApplicationStatus,
} from '../controllers/applicationController.js';
import {
  uploadDocument,
  updateDocumentStatus,
  sendConsolidatedReuploadRequest,
  streamDocument,
  deleteDocumentVersion,
} from '../controllers/documentController.js';
import {
  submitFeePayment,
  getFees,
  verifyFeePayment,
} from '../controllers/feeController.js';
import {
  getSummaryReport,
  getAuditLogs,
} from '../controllers/reportController.js';
import { authenticateToken, requireRoles } from '../middlewares/auth.js';

const router = Router();

// Multer storage setup for temporary upload handling
const upload = multer({
  dest: path.resolve(process.env.STORAGE_DIR || './storage/temp'),
  limits: { fileSize: 10 * 1024 * 1024 }, // 10MB
});

// --- Auth Routes ---
router.post('/auth/login', login);
router.post('/auth/logout', authenticateToken, logout);
router.post('/auth/change-password', authenticateToken, changePassword);
router.get('/auth/me', authenticateToken, getMe);

// --- Super Admin User & Role Management Routes ---
router.get('/users', authenticateToken, requireRoles('SUPER_ADMIN'), getUsers);
router.post('/users', authenticateToken, requireRoles('SUPER_ADMIN'), createUser);
router.put('/users/:id', authenticateToken, requireRoles('SUPER_ADMIN'), updateUser);
router.delete('/users/:id', authenticateToken, requireRoles('SUPER_ADMIN'), deleteUser);
router.get('/roles', authenticateToken, requireRoles('SUPER_ADMIN'), getRoles);

// --- Academic Structure Routes ---
router.get('/academics/schools', authenticateToken, getSchools);
router.post('/academics/schools', authenticateToken, requireRoles('SUPER_ADMIN'), createSchool);
router.put('/academics/schools/:id', authenticateToken, requireRoles('SUPER_ADMIN'), updateSchool);
router.delete('/academics/schools/:id', authenticateToken, requireRoles('SUPER_ADMIN'), deleteSchool);

router.post('/academics/programs', authenticateToken, requireRoles('SUPER_ADMIN', 'SCHOOL_ADMIN', 'OFFICE_USER'), createProgram);
router.put('/academics/programs/:id', authenticateToken, requireRoles('SUPER_ADMIN', 'SCHOOL_ADMIN', 'OFFICE_USER'), updateProgram);
router.delete('/academics/programs/:id', authenticateToken, requireRoles('SUPER_ADMIN'), deleteProgram);

router.get('/academics/cycles', authenticateToken, getAdmissionCycles);
router.post('/academics/cycles', authenticateToken, requireRoles('SUPER_ADMIN', 'SCHOOL_ADMIN', 'OFFICE_USER'), createAdmissionCycle);
router.put('/academics/cycles/:id', authenticateToken, requireRoles('SUPER_ADMIN', 'SCHOOL_ADMIN', 'OFFICE_USER'), updateAdmissionCycle);
router.delete('/academics/cycles/:id', authenticateToken, requireRoles('SUPER_ADMIN'), deleteAdmissionCycle);

// --- Form & Document Builder Routes ---
router.get('/form-builder/:programId', authenticateToken, getProgramFormSchema);
router.put('/form-builder/:programId', authenticateToken, requireRoles('SUPER_ADMIN', 'SCHOOL_ADMIN', 'OFFICE_USER'), updateProgramFormSchema);
router.post('/form-builder/clone', authenticateToken, requireRoles('SUPER_ADMIN', 'SCHOOL_ADMIN', 'OFFICE_USER'), cloneProgramFormSchema);

// --- Student Enrollment & Aadhaar Unmasking Routes ---
router.post('/students', authenticateToken, requireRoles('SUPER_ADMIN', 'SCHOOL_ADMIN', 'OFFICE_USER'), createStudent);
router.get('/students', authenticateToken, getStudents);
router.post('/students/:id/unmask-aadhaar', authenticateToken, requireRoles('SUPER_ADMIN', 'OFFICE_USER', 'CENTRAL_OFFICE'), unmaskAadhaar);
router.post('/students/:id/reset-password', authenticateToken, requireRoles('SUPER_ADMIN', 'SCHOOL_ADMIN', 'OFFICE_USER'), resetStudentPassword);
router.post('/students/:id/admit', authenticateToken, requireRoles('SUPER_ADMIN', 'CENTRAL_ADMISSIONS', 'SCHOOL_ADMISSIONS'), admitStudent);
router.post('/students/:id/request-reverification', authenticateToken, requireRoles('SUPER_ADMIN', 'CENTRAL_ADMISSIONS', 'SCHOOL_ADMISSIONS'), requestReverification);

// --- Application Workflow Routes ---
router.get('/applications/my-application', authenticateToken, getMyApplication);
router.patch('/applications/my-application/draft', authenticateToken, updateApplicationDraft);
router.post('/applications/my-application/submit', authenticateToken, submitApplication);
router.patch('/applications/:id/status', authenticateToken, requireRoles('SUPER_ADMIN', 'SCHOOL_ADMIN', 'OFFICE_USER', 'CENTRAL_ACCOUNTS'), updateApplicationStatus);
router.post('/applications/:id/send-reupload-request', authenticateToken, requireRoles('SUPER_ADMIN', 'SCHOOL_ADMIN', 'OFFICE_USER', 'CENTRAL_ACCOUNTS'), sendConsolidatedReuploadRequest);

// --- Document Management Routes ---
router.post('/documents/upload', authenticateToken, upload.single('document'), uploadDocument);
router.patch('/documents/:id/status', authenticateToken, requireRoles('SUPER_ADMIN', 'SCHOOL_ADMIN', 'OFFICE_USER'), updateDocumentStatus);
router.get('/documents/stream/:fileName', authenticateToken, streamDocument);
router.delete('/documents/versions/:versionId', authenticateToken, requireRoles('SUPER_ADMIN', 'OFFICE_USER'), deleteDocumentVersion);

// --- Fee Clearance Routes ---
router.post('/fees/submit', authenticateToken, upload.single('receipt'), submitFeePayment);
router.get('/fees', authenticateToken, getFees);
router.patch('/fees/:feeRecordId/verify', authenticateToken, requireRoles('SUPER_ADMIN', 'CENTRAL_ACCOUNTS'), verifyFeePayment);

// --- Reports & Audit Logs Routes ---
router.get('/reports/summary', authenticateToken, getSummaryReport);
router.get('/audit-logs', authenticateToken, requireRoles('SUPER_ADMIN', 'SCHOOL_ADMIN', 'CENTRAL_ACCOUNTS'), getAuditLogs);

export default router;
