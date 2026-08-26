import nodemailer from 'nodemailer';

const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST || 'smtp.gmail.com',
  port: Number(process.env.SMTP_PORT) || 587,
  secure: Number(process.env.SMTP_PORT) === 465, // true for 465, false for other ports
  auth: {
    user: process.env.SMTP_USER || '',
    pass: process.env.SMTP_PASS || '',
  },
});

export interface StudentInviteEmailParams {
  toEmail: string;
  studentName: string;
  studentId: string;
  temporaryPassword: string;
  loginUrl: string;
}

export interface ReuploadRequestEmailParams {
  toEmail: string;
  studentName: string;
  studentId: string;
  itemType: string; // e.g. "10th Certificate Scan" or "Fee Receipt"
  remarks: string;
  requestedBy: string; // e.g. "Admissions Verification Office" or "Central Accounts"
  loginUrl: string;
}

/**
 * Send Student Invitation Email with Temporary Password and Copy Action Button
 */
export async function sendStudentInviteEmail(params: StudentInviteEmailParams): Promise<boolean> {
  const { toEmail, studentName, studentId, temporaryPassword, loginUrl } = params;

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
        .highlight-box { background: #f1f5f9; border-left: 4px solid #3b82f6; padding: 16px; border-radius: 6px; margin: 20px 0; }
        .credential-label { font-size: 12px; text-transform: uppercase; letter-spacing: 0.05em; color: #64748b; font-weight: 600; }
        .credential-value { font-size: 18px; font-weight: 700; color: #0f172a; font-family: monospace; letter-spacing: 1px; margin-top: 4px; }
        .btn-container { text-align: center; margin: 28px 0; }
        .btn { display: inline-block; background-color: #1e293b; color: #ffffff; padding: 12px 28px; text-decoration: none; border-radius: 8px; font-weight: 600; font-size: 14px; }
        .footer { font-size: 12px; text-align: center; color: #94a3b8; margin-top: 32px; border-top: 1px solid #f1f5f9; padding-top: 16px; }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <div class="title">GVPIHLR Admissions Portal</div>
          <div class="subtitle">Gayatri Vidya Parishad Institution of Higher Learning</div>
        </div>
        
        <div class="content">
          <p>Dear <strong>${studentName}</strong>,</p>
          <p>An admission application account has been created for you by the Admissions Office.</p>
          <p>Below are your initial login credentials:</p>
          
          <div class="highlight-box">
            <div class="credential-label">Student ID</div>
            <div class="credential-value">${studentId}</div>
            <div style="height: 12px;"></div>
            <div class="credential-label">Temporary Password</div>
            <div class="credential-value">${temporaryPassword}</div>
          </div>
          
          <p style="font-size: 13px; color: #64748b;">
            <em>Note: For security reasons, you will be required to change your temporary password immediately upon your first login.</em>
          </p>
          
          <div class="btn-container">
            <a href="${loginUrl}" class="btn" target="_blank">Access Admissions Portal</a>
          </div>
        </div>
        
        <div class="footer">
          GVPIHLR University Admissions Office &bull; Secure Automated Notification
        </div>
      </div>
    </body>
    </html>
  `;

  try {
    if (process.env.NODE_ENV === 'development' && !process.env.SMTP_USER) {
      console.log(`[DEV MAIL MOCK] Invitation Email sent to ${toEmail}: Temp Password = ${temporaryPassword}`);
      return true;
    }

    await transporter.sendMail({
      from: `"GVPIHLR Admissions" <${process.env.SMTP_USER}>`,
      to: toEmail,
      subject: `Admission Account Created - ${studentId} | GVPIHLR`,
      html: htmlContent,
    });
    return true;
  } catch (error) {
    console.error('Failed to send email:', error);
    return false;
  }
}

/**
 * Send Automated Email Notification to Student when Re-upload is Requested by Office / Accounts
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
          <div class="title">GVPIHLR Admissions ERP</div>
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
          GVPIHLR Admissions Office &bull; Automated Re-upload Notification
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
      from: `"GVPIHLR Admissions" <${process.env.SMTP_USER}>`,
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
