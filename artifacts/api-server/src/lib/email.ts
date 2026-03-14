import nodemailer from "nodemailer";

const transporter = nodemailer.createTransport({
  host: "mail.cyberpersons.com",
  port: 587,
  secure: false,
  requireTLS: true,
  auth: {
    user: "notif@ctrxl.id",
    pass: "Hendra123",
  },
  tls: {
    rejectUnauthorized: false,
  },
});

export async function sendOtpEmail(toEmail: string, username: string, otp: string): Promise<void> {
  await transporter.sendMail({
    from: '"OVRHUB" <notif@ctrxl.id>',
    to: toEmail,
    subject: `Your OVRHUB verification code: ${otp}`,
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 480px; margin: 0 auto; background: #0d0d0d; color: #fff; padding: 32px; border-radius: 16px;">
        <div style="text-align: center; margin-bottom: 28px;">
          <div style="display: inline-block; background: #FF6600; width: 52px; height: 52px; border-radius: 12px; line-height: 52px; font-size: 24px; font-weight: 900; color: white;">N</div>
          <h1 style="margin: 12px 0 0; font-size: 22px; letter-spacing: -0.5px;">OVR<span style="color: #FF6600;">HUB</span></h1>
        </div>

        <h2 style="font-size: 20px; font-weight: 700; margin: 0 0 8px;">Hi ${username}, verify your email</h2>
        <p style="color: #aaa; margin: 0 0 28px; line-height: 1.6;">
          Use the code below to complete your registration. It expires in <strong style="color: #fff;">10 minutes</strong>.
        </p>

        <div style="background: #1a1a1a; border: 2px solid #FF6600; border-radius: 12px; padding: 24px; text-align: center; margin-bottom: 28px;">
          <span style="font-size: 44px; font-weight: 900; letter-spacing: 12px; color: #FF6600; font-family: monospace;">${otp}</span>
        </div>

        <p style="color: #666; font-size: 13px; text-align: center; margin: 0;">
          If you didn't create an account, you can safely ignore this email.
        </p>
      </div>
    `,
    text: `Your OVRHUB verification code is: ${otp}\n\nThis code expires in 10 minutes.\n\nIf you didn't create an account, ignore this email.`,
  });
}

export function generateOtp(): string {
  return String(Math.floor(100000 + Math.random() * 900000));
}
