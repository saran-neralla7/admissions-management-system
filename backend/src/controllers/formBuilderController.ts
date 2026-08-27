import { Request, Response } from 'express';
import { prisma } from '../config/prisma.js';
import { createAuditLog } from '../services/auditService.js';

/**
 * GET /api/v1/form-builder/:programId
 */
export async function getProgramFormSchema(req: Request, res: Response) {
  try {
    const programId = String(req.params.programId);

    const program: any = await prisma.program.findUnique({
      where: { id: programId },
      include: {
        school: { select: { id: true, name: true, code: true } },
        formFields: { orderBy: { displayOrder: 'asc' } },
        documentRules: { orderBy: { displayOrder: 'asc' } },
      },
    });

    if (!program) {
      return res.status(404).json({ success: false, error: 'Program not found.' });
    }

    const parsedFields = program.formFields.map((f: any) => {
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

    return res.json({
      success: true,
      data: {
        ...program,
        fields: parsedFields,
        docRequirements: program.documentRules || [],
      },
    });
  } catch (error: any) {
    console.error('Fetch form schema error:', error);
    return res.status(500).json({ success: false, error: 'Failed to fetch form schema.' });
  }
}

/**
 * PUT /api/v1/form-builder/:programId
 * Updates form fields AND document requirements atomically!
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
      // 1. Update Document Rules if provided
      if (Array.isArray(docRequirements)) {
        await tx.documentRule.deleteMany({ where: { programId } });
        if (docRequirements.length > 0) {
          await tx.documentRule.createMany({
            data: docRequirements.map((d: any, idx: number) => ({
              programId: programId,
              documentType: d.documentType || `DOC_${idx}`,
              label: d.label || d.documentType,
              isRequired: d.isRequired !== undefined ? Boolean(d.isRequired) : true,
              maxSizeMB: d.maxSizeMB || 5,
              allowedExts: JSON.stringify(d.allowedExts || ['.pdf', '.jpg']),
              displayOrder: idx,
            })),
          });
        }
      }

      // 2. Process Form Fields
      if (Array.isArray(fields)) {
        await tx.formField.deleteMany({ where: { programId } });

        const seenKeys = new Map<string, number>();
        const sanitizedFields = fields.map((field: any, idx: number) => {
          let baseKey = String(field.fieldKey || field.fieldLabel || `field_${idx}`)
            .toLowerCase()
            .replace(/[^a-z0-9_]/g, '_')
            .replace(/^_+|_+$/g, '');

          if (!baseKey) baseKey = `field_${idx}`;

          const currentCount = seenKeys.get(baseKey) || 0;
          seenKeys.set(baseKey, currentCount + 1);

          const uniqueKey = currentCount === 0 ? baseKey : `${baseKey}_${currentCount}`;

          const validationObj = {
            required: field.validationPreset === 'none' ? false : field.validation?.required ?? true,
            preset: field.validationPreset || 'none',
          };

          return {
            programId,
            sectionName: String(field.sectionName || 'GENERAL_INFORMATION').toUpperCase().trim(),
            fieldKey: uniqueKey,
            fieldLabel: String(field.fieldLabel || 'Untitled Field').trim(),
            fieldType: String(field.fieldType || 'text').toLowerCase(),
            options: Array.isArray(field.options) ? JSON.stringify(field.options) : null,
            validation: JSON.stringify(validationObj),
            conditional: field.conditional ? JSON.stringify(field.conditional) : null,
            displayOrder: idx,
          };
        });

        if (sanitizedFields.length > 0) {
          await tx.formField.createMany({ data: sanitizedFields });
        }
      }
    });

    await createAuditLog({
      userId: req.user?.userId,
      roleName: req.user?.role || 'ADMIN',
      action: 'FORM_SCHEMA_UPDATED',
      module: 'FORM_BUILDER',
      ipAddress: req.ip || '127.0.0.1',
      details: { programId, fieldsCount: fields?.length, docRequirementsCount: docRequirements?.length },
    });

    return res.json({ success: true, message: 'Program form schema & document rules updated successfully.' });
  } catch (error: any) {
    console.error('Update form schema error:', error);
    return res.status(500).json({ success: false, error: error.message || 'Failed to update form schema.' });
  }
}

/**
 * POST /api/v1/form-builder/clone
 * Clones form fields AND document rules from source program to target program.
 */
export async function cloneProgramFormSchema(req: Request, res: Response) {
  try {
    const { sourceProgramId, targetProgramId } = req.body;

    if (!sourceProgramId || !targetProgramId) {
      return res.status(400).json({ success: false, error: 'Source and Target program IDs are required.' });
    }

    const sourceProgram: any = await prisma.program.findUnique({
      where: { id: String(sourceProgramId) },
      include: { formFields: true, documentRules: true },
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
      // 1. Clone document rules
      await tx.documentRule.deleteMany({ where: { programId: String(targetProgramId) } });
      if (sourceProgram.documentRules.length > 0) {
        await tx.documentRule.createMany({
          data: sourceProgram.documentRules.map((rule: any) => ({
            programId: String(targetProgramId),
            documentType: rule.documentType,
            label: rule.label,
            isRequired: rule.isRequired,
            maxSizeMB: rule.maxSizeMB,
            allowedExts: rule.allowedExts,
            displayOrder: rule.displayOrder,
          })),
        });
      }

      // 2. Clone form fields
      await tx.formField.deleteMany({ where: { programId: String(targetProgramId) } });

      if (sourceProgram.formFields.length > 0) {
        await tx.formField.createMany({
          data: sourceProgram.formFields.map((field: any) => ({
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
      message: `Successfully cloned ${sourceProgram.formFields.length} form fields and ${sourceProgram.documentRules.length} document rules to target program.`,
    });
  } catch (error: any) {
    console.error('Form clone error:', error);
    return res.status(500).json({ success: false, error: 'Failed to clone form schema.' });
  }
}
