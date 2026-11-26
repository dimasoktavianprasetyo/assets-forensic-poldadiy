const { Resend } = require('resend');

const sendMail = async ({
  email,
  name,
  link,
  idurar_app_email,
  subject = 'Verify your email | SIM-ASET',
}) => {
  if (!process.env.RESEND_API) return null;
  const resend = new Resend(process.env.RESEND_API);

  const { data } = await resend.emails.send({
    from: idurar_app_email,
    to: email,
    subject,
    html: `<p>Halo ${name || 'Pengguna'}, silakan buka tautan berikut: <a href="${link}">${link}</a></p>`,
  });

  return data;
};

module.exports = sendMail;
