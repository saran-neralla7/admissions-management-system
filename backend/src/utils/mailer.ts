import nodemailer from 'nodemailer';

const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST || 'smtp.gmail.com',
  port: parseInt(process.env.SMTP_PORT || '587', 10),
  secure: process.env.SMTP_SECURE === 'true',
  auth: {
    user: process.env.SMTP_USER || '',
    pass: process.env.SMTP_PASS || '',
  },
});

export interface StudentCredentialsEmailParams {
  toEmail: string;
  studentName: string;
  studentId: string;
  tempPassword: string;
  programName: string;
  schoolName: string;
  loginUrl: string;
}

export interface ReuploadRequestEmailParams {
  toEmail: string;
  studentName: string;
  studentId: string;
  itemType: string;
  remarks: string;
  requestedBy: string;
  loginUrl: string;
}

export interface ReuploadItem {
  itemType: string;
  remarks: string;
}

export interface ConsolidatedReuploadEmailParams {
  toEmail: string;
  studentName: string;
  studentId: string;
  reuploadItems: ReuploadItem[];
  requestedBy: string;
  loginUrl: string;
}

/**
 * Send Automated Email Notification with Login Credentials to New Student
 */
export async function sendStudentCredentialsEmail(params: StudentCredentialsEmailParams): Promise<boolean> {
  const { toEmail, studentName, studentId, tempPassword, programName, schoolName, loginUrl } = params;

  const htmlContent = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <style>
        body { font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; background-color: #f8fafc; color: #0f172a; margin: 0; padding: 20px; }
        .container { max-width: 600px; margin: 0 auto; background: #ffffff; border: 1px solid #e2e8f0; border-radius: 12px; padding: 32px; box-shadow: 0 4px 6px -1px rgba(0,0,0,0.05); }
        .header { text-align: center; border-bottom: 2px solid #f1f5f9; padding-bottom: 20px; margin-bottom: 24px; }
        .title { font-size: 20px; font-weight: 700; color: #1e293b; margin: 8px 0 0 0; }
        .subtitle { font-size: 14px; color: #64748b; margin-top: 4px; }
        .content { font-size: 14px; line-height: 1.6; color: #334155; }
        .cred-box { background: #f1f5f9; border-left: 4px solid #0f172a; padding: 16px; border-radius: 6px; margin: 20px 0; }
        .cred-item { margin: 8px 0; }
        .cred-label { font-size: 12px; text-transform: uppercase; letter-spacing: 0.05em; color: #64748b; font-weight: 600; }
        .cred-value { font-size: 16px; font-weight: 700; color: #0f172a; font-family: monospace; }
        .btn-container { text-align: center; margin: 28px 0; }
        .btn { display: inline-block; background-color: #0f172a; color: #ffffff; padding: 12px 28px; text-decoration: none; border-radius: 8px; font-weight: 600; font-size: 14px; }
        .footer { font-size: 12px; text-align: center; color: #94a3b8; margin-top: 32px; border-top: 1px solid #f1f5f9; padding-top: 16px; }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <div class="title">Gayatri Vidya Parishad (GVP)</div>
          <div class="subtitle">Admissions Portal &bull; Student Account Credentials</div>
        </div>
        
        <div class="content">
          <p>Dear <strong>${studentName}</strong>,</p>
          <p>Congratulations! An admission profile has been registered for you at <strong>Gayatri Vidya Parishad</strong> under <strong>${programName}</strong> (${schoolName}).</p>
          
          <p>Below are your secure login credentials for the GVP Admissions Student Portal. Upon your first sign-in, you will be required to change your temporary password.</p>
          
          <div class="cred-box">
            <div class="cred-item">
              <div class="cred-label">Student Login ID</div>
              <div class="cred-value">${studentId}</div>
            </div>
            <div class="cred-item">
              <div class="cred-label">Registered Email</div>
              <div class="cred-value">${toEmail}</div>
            </div>
            <div class="cred-item">
              <div class="cred-label">Temporary Password</div>
              <div class="cred-value">${tempPassword}</div>
            </div>
          </div>

          <div class="btn-container">
            <a href="${loginUrl}" class="btn" target="_blank">Access Student Portal</a>
          </div>

          <p style="font-size: 12px; color: #64748b;">If you did not request this registration, please contact the GVP Admissions Office immediately.</p>
        </div>
        
        <div class="footer">
          Gayatri Vidya Parishad Admissions Office &bull; Confidential
        </div>
      </div>
    </body>
    </html>
  `;

  try {
    if (process.env.NODE_ENV === 'development' && !process.env.SMTP_USER) {
      console.log(`[DEV MAIL MOCK] Credentials Email sent to ${toEmail}: Student ID = ${studentId}, Temp Pass = ${tempPassword}`);
      return true;
    }

    await transporter.sendMail({
      from: `"GVP Admissions" <${process.env.SMTP_USER}>`,
      to: toEmail,
      subject: `Welcome to GVP Admissions | Your Student Credentials (${studentId})`,
      html: htmlContent,
    });
    return true;
  } catch (error) {
    console.error('Failed to send credentials email:', error);
    return false;
  }
}

/**
 * Send Automated Single Email Notification to Student when Re-upload is Requested
 */
export async function sendReuploadRequestEmail(params: ReuploadRequestEmailParams): Promise<boolean> {
  const { toEmail, studentName, studentId, itemType, remarks, requestedBy, loginUrl } = params;

  const htmlContent = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <style>
        body { font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; background-color: #f8fafc; color: #0f172a; margin: 0; padding: 20px; }
        .container { max-width: 600px; margin: 0 auto; background: #ffffff; border: 1px solid #e2e8f0; border-radius: 12px; padding: 32px; box-shadow: 0 4px 6px -1px rgba(0,0,0,0.05); }
        .header { text-align: center; border-bottom: 2px solid #f1f5f9; padding-bottom: 20px; margin-bottom: 24px; }
        .title { font-size: 20px; font-weight: 700; color: #1e293b; margin: 8px 0 0 0; }
        .subtitle { font-size: 14px; color: #64748b; margin-top: 4px; }
        .content { font-size: 14px; line-height: 1.6; color: #334155; }
        .alert-box { background: #fff1f2; border-left: 4px solid #f43f5e; padding: 16px; border-radius: 6px; margin: 20px 0; }
        .alert-label { font-size: 12px; text-transform: uppercase; letter-spacing: 0.05em; color: #9f1239; font-weight: 700; }
        .alert-value { font-size: 15px; font-weight: 600; color: #881337; margin-top: 4px; }
        .btn-container { text-align: center; margin: 28px 0; }
        .btn { display: inline-block; background-color: #0f172a; color: #ffffff; padding: 12px 28px; text-decoration: none; border-radius: 8px; font-weight: 600; font-size: 14px; }
        .footer { font-size: 12px; text-align: center; color: #94a3b8; margin-top: 32px; border-top: 1px solid #f1f5f9; padding-top: 16px; }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <div class="title">Gayatri Vidya Parishad (GVP)</div>
          <div class="subtitle">Action Required: Document / Receipt Re-upload Needed</div>
        </div>
        
        <div class="content">
          <p>Dear <strong>${studentName}</strong> (Student ID: <code>${studentId}</code>),</p>
          <p>The <strong>${requestedBy}</strong> has audited your application and requested a <strong>re-upload</strong> for your <strong>${itemType}</strong>.</p>
          
          <div class="alert-box">
            <div class="alert-label">Officer Note / Instructions</div>
            <div class="alert-value">"${remarks}"</div>
          </div>
          
          <p>Please log into your student portal immediately, navigate to the required section, and upload a clear original copy to proceed with your admission verification.</p>
          
          <div class="btn-container">
            <a href="${loginUrl}" class="btn" target="_blank">Login to Re-upload Scan</a>
          </div>
        </div>
        
        <div class="footer">
          Gayatri Vidya Parishad Admissions Office &bull; Automated Re-upload Notification
        </div>
      </div>
    </body>
    </html>
  `;

  try {
    if (process.env.NODE_ENV === 'development' && !process.env.SMTP_USER) {
      console.log(`[DEV MAIL MOCK] Re-upload Notification sent to ${toEmail}: Item = ${itemType}, Remarks = "${remarks}"`);
      return true;
    }

    await transporter.sendMail({
      from: `"GVP Admissions" <${process.env.SMTP_USER}>`,
      to: toEmail,
      subject: `Action Required: Re-upload Requested for ${itemType} | ${studentId}`,
      html: htmlContent,
    });
    return true;
  } catch (error) {
    console.error('Failed to send reupload email:', error);
    return false;
  }
}

/**
 * Send Consolidated Automated Email Notification to Student listing ALL requested re-uploads
 */
export async function sendConsolidatedReuploadEmail(params: ConsolidatedReuploadEmailParams): Promise<boolean> {
  const { toEmail, studentName, studentId, reuploadItems, requestedBy, loginUrl } = params;

  const itemsHtml = reuploadItems.map(item => `
    <div style="background: #fff1f2; border-left: 4px solid #f43f5e; padding: 14px 16px; border-radius: 8px; margin-bottom: 12px;">
      <div style="font-size: 13px; text-transform: uppercase; letter-spacing: 0.05em; color: #9f1239; font-weight: 700;">📄 ${item.itemType}</div>
      <div style="font-size: 14px; font-weight: 600; color: #881337; margin-top: 4px;">Officer Note: "${item.remarks || 'Please re-upload a clear original scan.'}"</div>
    </div>
  `).join('');

  const htmlContent = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <style>
        body { font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; background-color: #f8fafc; color: #0f172a; margin: 0; padding: 20px; }
        .container { max-width: 600px; margin: 0 auto; background: #ffffff; border: 1px solid #e2e8f0; border-radius: 12px; padding: 32px; box-shadow: 0 4px 6px -1px rgba(0,0,0,0.05); }
        .header { text-align: center; border-bottom: 2px solid #f1f5f9; padding-bottom: 20px; margin-bottom: 24px; }
        .title { font-size: 20px; font-weight: 700; color: #1e293b; margin: 8px 0 0 0; }
        .subtitle { font-size: 14px; color: #64748b; margin-top: 4px; }
        .content { font-size: 14px; line-height: 1.6; color: #334155; }
        .btn-container { text-align: center; margin: 28px 0; }
        .btn { display: inline-block; background-color: #0f172a; color: #ffffff; padding: 12px 28px; text-decoration: none; border-radius: 8px; font-weight: 600; font-size: 14px; }
        .footer { font-size: 12px; text-align: center; color: #94a3b8; margin-top: 32px; border-top: 1px solid #f1f5f9; padding-top: 16px; }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <div class="title">Gayatri Vidya Parishad (GVP)</div>
          <div class="subtitle">Action Required: Certificate Re-upload Notification</div>
        </div>
        
        <div class="content">
          <p>Dear <strong>${studentName}</strong> (Student ID: <code>${studentId}</code>),</p>
          <p>The <strong>${requestedBy}</strong> has audited your submitted application documents. The following <strong>${reuploadItems.length} certificate document(s)</strong> require re-upload:</p>
          
          ${itemsHtml}
          
          <p>Your application status has been set to <strong>Correction Required</strong>. Please log into your student portal immediately, navigate to the Document Scans section, and upload clear original scans to proceed with your admission verification.</p>
          
          <div class="btn-container">
            <a href="${loginUrl}" class="btn" target="_blank">Login to Re-upload Certificates</a>
          </div>
        </div>
        
        <div class="footer">
          Gayatri Vidya Parishad Admissions Office &bull; Automated Re-upload Notification
        </div>
      </div>
    </body>
    </html>
  `;

  try {
    if (process.env.NODE_ENV === 'development' && !process.env.SMTP_USER) {
      console.log(`[DEV MAIL MOCK] Consolidated Re-upload Notification sent to ${toEmail} for ${reuploadItems.length} items.`);
      return true;
    }

    await transporter.sendMail({
      from: `"GVP Admissions" <${process.env.SMTP_USER}>`,
      to: toEmail,
      subject: `Action Required: Re-upload Requested for ${reuploadItems.length} Document(s) | ${studentId}`,
      html: htmlContent,
    });
    return true;
  } catch (error) {
    console.error('Failed to send consolidated reupload email:', error);
    return false;
  }
}

export interface AdmissionConfirmationEmailParams {
  toEmail: string;
  studentName: string;
  studentId: string;
  programName: string;
  schoolName: string;
  academicYear: number;
  loginUrl: string;
}

/**
 * Send Official Admission Confirmation Email to Student upon final admission grant
 */
export async function sendAdmissionConfirmationEmail(params: AdmissionConfirmationEmailParams): Promise<boolean> {
  const { toEmail, studentName, studentId, programName, schoolName, academicYear, loginUrl } = params;

  const htmlContent = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <style>
        body { font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; background-color: #f8fafc; color: #0f172a; margin: 0; padding: 20px; }
        .container { max-width: 600px; margin: 0 auto; background: #ffffff; border: 1px solid #e2e8f0; border-radius: 12px; padding: 32px; box-shadow: 0 4px 6px -1px rgba(0,0,0,0.05); }
        .header { text-align: center; border-bottom: 2px solid #f1f5f9; padding-bottom: 20px; margin-bottom: 24px; }
        .title { font-size: 22px; font-weight: 800; color: #065f46; margin: 8px 0 0 0; }
        .subtitle { font-size: 14px; color: #047857; font-weight: 600; margin-top: 4px; }
        .content { font-size: 14px; line-height: 1.6; color: #334155; }
        .congrats-box { background: #ecfdf5; border-left: 5px solid #10b981; padding: 20px; border-radius: 8px; margin: 20px 0; }
        .cred-item { margin: 8px 0; }
        .cred-label { font-size: 11px; text-transform: uppercase; letter-spacing: 0.05em; color: #047857; font-weight: 700; }
        .cred-value { font-size: 15px; font-weight: 700; color: #064e3b; }
        .btn-container { text-align: center; margin: 28px 0; }
        .btn { display: inline-block; background-color: #047857; color: #ffffff; padding: 12px 28px; text-decoration: none; border-radius: 8px; font-weight: 700; font-size: 14px; }
        .footer { font-size: 12px; text-align: center; color: #94a3b8; margin-top: 32px; border-top: 1px solid #f1f5f9; padding-top: 16px; }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <div class="title">Gayatri Vidya Parishad (GVP)</div>
          <div class="subtitle">🎉 Official Admission Confirmation</div>
        </div>
        
        <div class="content">
          <p>Dear <strong>${studentName}</strong>,</p>
          <p>Congratulations! We are delighted to inform you that your official admission process at <strong>Gayatri Vidya Parishad</strong> has been <strong>SUCCESSFULLY COMPLETED AND CONFIRMED</strong>!</p>
          
          <div class="congrats-box">
            <div class="cred-item">
              <div class="cred-label">Student ID</div>
              <div class="cred-value" style="font-family: monospace;">${studentId}</div>
            </div>
            <div class="cred-item">
              <div class="cred-label">Admitted Program & Department</div>
              <div class="cred-value">${programName}</div>
            </div>
            <div class="cred-item">
              <div class="cred-label">University School</div>
              <div class="cred-value">${schoolName}</div>
            </div>
            <div class="cred-item">
              <div class="cred-label">Academic Batch</div>
              <div class="cred-value">Academic Year ${academicYear}</div>
            </div>
            <div class="cred-item">
              <div class="cred-label">Verification & Fee Clearance Status</div>
              <div class="cred-value" style="color: #059669;">100% VERIFIED & CLEARED</div>
            </div>
          </div>

          <p>Your certificate scans have been verified by the Verification Office, and your tuition fee receipt has been cleared by Central Accounts. Your seat is now officially locked for the upcoming academic session.</p>

          <div class="btn-container">
            <a href="${loginUrl}" class="btn" target="_blank">Access Student Portal & Download Slip</a>
          </div>

          <p style="font-size: 12px; color: #64748b;">We welcome you to Gayatri Vidya Parishad and wish you outstanding academic success!</p>
        </div>
        
        <div class="footer">
          Gayatri Vidya Parishad Central Admissions Office &bull; Official Confirmation
        </div>
      </div>
    </body>
    </html>
  `;

  try {
    if (process.env.NODE_ENV === 'development' && !process.env.SMTP_USER) {
      console.log(`[DEV MAIL MOCK] Admission Confirmation Email sent to ${toEmail} for ${studentName} (${studentId}).`);
      return true;
    }

    await transporter.sendMail({
      from: `"GVP Admissions Office" <${process.env.SMTP_USER}>`,
      to: toEmail,
      subject: `🎉 Congratulations! Admission Confirmed at GVP | ${studentId}`,
      html: htmlContent,
    });
    return true;
  } catch (error) {
    console.error('Failed to send admission confirmation email:', error);
    return false;
  }
}

