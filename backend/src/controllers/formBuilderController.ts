import { Request, Response } from 'express';
import { prisma } from '../config/prisma.js';
import { createAuditLog } from '../services/auditService.js';

/**
 * GET /api/v1/form-builder/:programId
 */
export async function getProgramFormSchema(req: Request, res: Response) {
  try {
    const programId = String(req.params.programId);

    const program = await prisma.program.findUnique({
      where: { id: programId },
      include: {
        school: { select: { id: true, name: true, code: true } },
        formFields: { orderBy: { displayOrder: 'asc' } },
      },
    });

    if (!program) {
      return res.status(404).json({ success: false, error: 'Program not found.' });
    }

    const parsedFields = program.formFields.map((f) => {
      let parsedValidation = { required: true, preset: 'none' };
      try {
        if (f.validation) parsedValidation = JSON.parse(f.validation);
      } catch (e) {}

      return {
        ...f,
        options: f.options ? JSON.parse(f.options) : null,
        validation: parsedValidation,
        validationPreset: parsedValidation.preset || 'none',
        conditional: f.conditional ? JSON.parse(f.conditional) : null,
      };
    });

    let docRequirements: any[] = [];
    try {
      if (program.docRequirements) {
        docRequirements = JSON.parse(program.docRequirements);
      }
    } catch (e) {}

    return res.json({ 
      success: true, 
      data: { 
        ...program, 
        fields: parsedFields,
        docRequirements: docRequirements,
      } 
    });
  } catch (error: any) {
    console.error('Fetch form schema error:', error);
    return res.status(500).json({ success: false, error: 'Failed to fetch form schema.' });
  }
}

/**
 * PUT /api/v1/form-builder/:programId
 * Updates form fields AND document requirements atomically!
 * Auto-deduplicates field keys to guarantee P2002 unique constraint never fails!
 */
export async function updateProgramFormSchema(req: Request, res: Response) {
  try {
    const programId = String(req.params.programId);
    const { fields, docRequirements } = req.body;

    const program = await prisma.program.findUnique({ where: { id: programId } });
    if (!program) {
      return res.status(404).json({ success: false, error: 'Program not found.' });
    }

    if (req.user?.role !== 'SUPER_ADMIN' && req.user?.schoolId !== program.schoolId) {
      return res.status(403).json({ success: false, error: 'Forbidden. School isolation mismatch.' });
    }

    await prisma.$transaction(async (tx) => {
      // 1. Update Document Requirements if provided
      if (docRequirements !== undefined) {
        await tx.program.update({
          where: { id: programId },
          data: {
            docRequirements: Array.isArray(docRequirements) ? JSON.stringify(docRequirements) : null,
          },
        });
      }

      // 2. Update Form Fields if provided
      if (Array.isArray(fields)) {
        await tx.formField.deleteMany({ where: { programId } });

        if (fields.length > 0) {
          const usedKeys = new Set<string>();

          const sanitizedFields = fields.map((f: any, index: number) => {
            let rawKey = String(f.fieldKey || f.fieldLabel || `field_${index + 1}`)
              .trim()
              .toLowerCase()
              .replace(/[^a-z0-9_]/g, '_')
              .replace(/^_+|_+$/g, '');

            if (!rawKey) rawKey = `field_${index + 1}`;

            let finalKey = rawKey;
            let counter = 1;
            while (usedKeys.has(finalKey)) {
              finalKey = `${rawKey}_${counter}`;
              counter++;
            }
            usedKeys.add(finalKey);

            const isRequired = typeof f.validation === 'object' ? Boolean(f.validation?.required) : Boolean(f.required);
            const preset = f.validationPreset || (f.validation && f.validation.preset) || 'none';

            return {
              programId,
              sectionName: String(f.sectionName || 'General Details').trim(),
              fieldKey: finalKey,
              fieldLabel: String(f.fieldLabel || `Question ${index + 1}`).trim(),
              fieldType: f.fieldType || 'text',
              options: f.options ? JSON.stringify(f.options) : null,
              validation: JSON.stringify({ required: isRequired, preset }),
              conditional: f.conditional ? JSON.stringify(f.conditional) : null,
              displayOrder: index + 1,
            };
          });

          await tx.formField.createMany({
            data: sanitizedFields,
          });
        }
      }
    });

    await createAuditLog({
      userId: req.user?.userId,
      roleName: req.user?.role || 'ADMIN',
      action: 'FORM_SCHEMA_UPDATED',
      module: 'FORM_BUILDER',
      ipAddress: req.ip || '127.0.0.1',
      details: { programId, fieldCount: fields?.length || 0, docRequirementCount: docRequirements?.length || 0 },
    });

    return res.json({ success: true, message: 'Form and document builder schema updated successfully.' });
  } catch (error: any) {
    console.error('Form schema update error:', error);
    return res.status(500).json({ success: false, error: 'Failed to update form schema.' });
  }
}

/**
 * POST /api/v1/form-builder/clone
 * Clones form fields AND document requirements to target program!
 */
export async function cloneProgramFormSchema(req: Request, res: Response) {
  try {
    const { sourceProgramId, targetProgramId } = req.body;

    if (!sourceProgramId || !targetProgramId) {
      return res.status(400).json({ 
        success: false, 
        error: 'Both sourceProgramId and targetProgramId are required.' 
      });
    }

    if (sourceProgramId === targetProgramId) {
      return res.status(400).json({ success: false, error: 'Source and target program cannot be the same.' });
    }

    const sourceProgram = await prisma.program.findUnique({
      where: { id: String(sourceProgramId) },
      include: { formFields: { orderBy: { displayOrder: 'asc' } } },
    });

    if (!sourceProgram) {
      return res.status(404).json({ success: false, error: 'Source program not found.' });
    }

    const targetProgram = await prisma.program.findUnique({ where: { id: String(targetProgramId) } });
    if (!targetProgram) {
      return res.status(404).json({ success: false, error: 'Target program not found.' });
    }

    if (req.user?.role !== 'SUPER_ADMIN' && req.user?.schoolId !== targetProgram.schoolId) {
      return res.status(403).json({ success: false, error: 'Forbidden. Mismatch with target program school.' });
    }

    await prisma.$transaction(async (tx) => {
      // 1. Clone doc requirements
      await tx.program.update({
        where: { id: String(targetProgramId) },
        data: { docRequirements: sourceProgram.docRequirements },
      });

      // 2. Clone form fields
      await tx.formField.deleteMany({ where: { programId: String(targetProgramId) } });

      if (sourceProgram.formFields.length > 0) {
        await tx.formField.createMany({
          data: sourceProgram.formFields.map((field) => ({
            programId: String(targetProgramId),
            sectionName: field.sectionName,
            fieldKey: field.fieldKey,
            fieldLabel: field.fieldLabel,
            fieldType: field.fieldType,
            options: field.options,
            validation: field.validation,
            conditional: field.conditional,
            displayOrder: field.displayOrder,
          })),
        });
      }
    });

    await createAuditLog({
      userId: req.user?.userId,
      roleName: req.user?.role || 'ADMIN',
      action: 'FORM_CLONED',
      module: 'FORM_BUILDER',
      ipAddress: req.ip || '127.0.0.1',
      details: { sourceProgramId, targetProgramId, clonedCount: sourceProgram.formFields.length },
    });

    return res.json({ 
      success: true, 
      message: `Successfully cloned ${sourceProgram.formFields.length} form fields and document requirements to target program.` 
    });
  } catch (error: any) {
    console.error('Form clone error:', error);
    return res.status(500).json({ success: false, error: 'Failed to clone form schema.' });
  }
}
