type SendOptions = { to: string; subject: string; text?: string; html?: string };
type MailTransport = { sendMail: (opts: { from: string; to: string; subject: string; text?: string; html?: string }) => Promise<unknown> };

let transporter: MailTransport | null = null;
async function getTransport(): Promise<MailTransport | null> {
  try {
    if (transporter) return transporter;
    // Dynamic import to avoid build/runtime failure if module is missing
    const nodemailer = await import('nodemailer');
    const host = process.env['SMTP_HOST'] || 'localhost';
    const port = Number(process.env['SMTP_PORT'] || '1025');
    const user: string | undefined = process.env['SMTP_USER'] || undefined;
    const pass: string | undefined = process.env['SMTP_PASS'] || undefined;
    const auth = user && pass ? { user, pass } : undefined;
    transporter = nodemailer.createTransport({ host, port, secure: false, auth }) as unknown as MailTransport;
    return transporter;
  } catch {
    return null;
  }
}

export async function sendMail({ to, subject, text, html }: SendOptions): Promise<void> {
  try {
    const t = await getTransport();
    const from = process.env['SMTP_FROM'] || 'CoupleBudget <noreply@example.com>';
    if (!t) {
      // Fallback: log to console
      // eslint-disable-next-line no-console
      console.log(`[mail:log] to=${to} subject=${subject}`);
      return;
    }
    await t.sendMail({ from, to, subject, text, html });
  } catch {
    // Swallow errors in non-critical flows
  }
}
