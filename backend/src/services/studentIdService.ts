import { prisma } from '../config/prisma.js';

/**
 * Generate a guaranteed unique Student ID within a database transaction.
 * Format: {ProgramPrefix}{AcademicYear}-{SequenceNumber} (e.g., GVPMEC2026-001)
 * Resets every academic year per program.
 */
export async function generateUniqueStudentId(
  programId: string,
  academicYear: number
): Promise<string> {
  return await prisma.$transaction(async (tx) => {
    // Fetch program details for prefix
    const program = await tx.program.findUnique({
      where: { id: programId },
      select: { studentIdPrefix: true },
    });

    if (!program) {
      throw new Error(`Program not found for ID: ${programId}`);
    }

    const prefix = program.studentIdPrefix || 'GVP';
    const searchPattern = `${prefix}${academicYear}-%`;

    // Find highest existing sequence number for this program + academic year
    const highestStudent = await tx.student.findFirst({
      where: {
        programId: programId,
        studentId: {
          startsWith: `${prefix}${academicYear}-`,
        },
      },
      orderBy: {
        studentId: 'desc',
      },
      select: {
        studentId: true,
      },
    });

    let nextSeq = 1;
    if (highestStudent && highestStudent.studentId) {
      const parts = highestStudent.studentId.split('-');
      if (parts.length === 2) {
        const currentSeq = parseInt(parts[1], 10);
        if (!isNaN(currentSeq)) {
          nextSeq = currentSeq + 1;
        }
      }
    }

    // Pad sequence number with leading zeros (e.g., 001, 002, 010, 100)
    const seqPadded = String(nextSeq).padStart(3, '0');
    return `${prefix}${academicYear}-${seqPadded}`;
  });
}
