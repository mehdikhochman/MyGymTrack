// Transactional e-mail through Resend (https://resend.com). Needs RESEND_API_KEY and EMAIL_FROM.
export const emailEnabled = () => !!process.env.RESEND_API_KEY && !!process.env.EMAIL_FROM;

export async function sendEmail(to: string, subject: string, text: string) {
  if (!emailEnabled()) return false;
  const res = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: { authorization: `Bearer ${process.env.RESEND_API_KEY}`, 'content-type': 'application/json' },
    body: JSON.stringify({ from: process.env.EMAIL_FROM, to, subject, text }),
  });
  return res.ok;
}
