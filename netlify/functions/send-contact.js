const { Resend } = require('resend');
const resend = new Resend(process.env.RESEND_API_KEY);
const FROM_EMAIL = 'hello@athletesoflife.online';
const NOTIFY_EMAIL = process.env.NOTIFY_EMAIL || 'a.lever.p7@gmail.com';

exports.handler = async function(event) {
  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, body: 'Method Not Allowed' };
  }
  let body;
  try { body = JSON.parse(event.body); } catch (e) { return { statusCode: 400, body: 'Bad Request' }; }

  const { name, sport, email, interest, message } = body;

  try {
    await Promise.all([
      // Auto-reply to the person
      resend.emails.send({
        from: FROM_EMAIL,
        to: email,
        subject: `Thanks for reaching out, ${name} — we'll be in touch`,
        html: `<div style="background:#0A0A0A;color:#F5F5F0;font-family:Arial,sans-serif;max-width:600px;margin:0 auto;padding:40px 32px;">
          <div style="font-size:22px;font-weight:900;color:#C9A84C;letter-spacing:.08em;margin-bottom:28px;">ATHLETES OF LIFE</div>
          <h1 style="font-size:26px;font-weight:700;margin-bottom:16px;">Hey ${name} — got your message.</h1>
          <p style="color:#aaa;font-size:15px;line-height:1.75;margin-bottom:20px;">
            I'm Anthony Lever. 15 years as a pro basketball player around the world. 
            Son of NBA All-Star Lafayette "Fat" Lever. I built Athletes of Life 
            because when my career ended, nobody handed me a playbook.
          </p>
          <p style="color:#aaa;font-size:15px;line-height:1.75;margin-bottom:28px;">
            I personally review every inquiry. You'll hear back from me within 24 hours.
          </p>
          <div style="background:#111;border:1px solid #222;border-radius:12px;padding:24px;margin-bottom:28px;">
            <div style="font-size:11px;letter-spacing:.14em;text-transform:uppercase;color:#C9A84C;margin-bottom:12px;">Your Message</div>
            <p style="color:#ccc;font-size:14px;line-height:1.6;">"${message}"</p>
          </div>
          <p style="color:#777;font-size:13px;border-top:1px solid #1a1a1a;padding-top:20px;">
            — Anthony Lever<br>
            <span style="color:#555;">Founder, Athletes of Life · Elev8ed Innovation LLC</span>
          </p>
        </div>`
      }),
      // Notify Anthony
      resend.emails.send({
        from: FROM_EMAIL,
        to: NOTIFY_EMAIL,
        subject: `New Hub Contact — ${name} (${interest})`,
        html: `<div style="font-family:Arial,sans-serif;padding:24px;">
          <h2 style="color:#C9A84C;">New Hub Contact</h2>
          <p><b>Name:</b> ${name}</p>
          <p><b>Email:</b> ${email}</p>
          <p><b>Sport:</b> ${sport || 'Not specified'}</p>
          <p><b>Interest:</b> ${interest}</p>
          <p><b>Message:</b> ${message}</p>
        </div>`
      })
    ]);

    return {
      statusCode: 200,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ success: true })
    };
  } catch (err) {
    console.error('Contact error:', err);
    return {
      statusCode: 500,
      body: JSON.stringify({ error: 'Failed to send' })
    };
  }
};
