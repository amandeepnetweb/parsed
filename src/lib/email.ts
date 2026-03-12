import { Resend } from "resend";

const FROM = "Parsed <onboarding@resend.dev>";
const APP_NAME = "Parsed";

export async function sendResetPasswordEmail({
  to,
  url,
}: {
  to: string;
  url: string;
}) {
  const resend = new Resend(process.env.RESEND_API_KEY);
  await resend.emails.send({
    from: FROM,
    to,
    subject: `Reset your ${APP_NAME} password`,
    html: `
      <div style="font-family:sans-serif;max-width:480px;margin:0 auto;padding:32px 24px">
        <h2 style="margin:0 0 8px">Reset your password</h2>
        <p style="color:#555;margin:0 0 24px">
          We received a request to reset the password for your ${APP_NAME} account.
          Click the button below to choose a new password. This link expires in 15 minutes.
        </p>
        <a href="${url}"
           style="display:inline-block;background:#000;color:#fff;text-decoration:none;
                  padding:12px 24px;border-radius:6px;font-weight:500">
          Reset password
        </a>
        <p style="color:#999;font-size:12px;margin:24px 0 0">
          If you didn't request a password reset, you can safely ignore this email.
        </p>
      </div>
    `,
  });
}
