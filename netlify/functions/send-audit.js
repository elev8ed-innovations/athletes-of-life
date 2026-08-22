const Anthropic = require('@anthropic-ai/sdk');
const { Resend } = require('resend');
const {
  COPY,
  buildFallbackAudit,
  buildPrompt,
  cleanAuditText,
  escapeHtml,
  getReadinessLabel,
  validateMainAudit
} = require('./audit-utils');

let anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
let resend = new Resend(process.env.RESEND_API_KEY);
const FROM_EMAIL = 'hello@athletesoflife.online';
const NOTIFY_EMAIL = process.env.NOTIFY_EMAIL || 'a.lever.p7@gmail.com';
const CAL_LINK = 'https://calendly.com/admin-peptbiohacking/athletes-of-life-strategy-call';

// Airtable config
const AIRTABLE_BASE = 'app3b0yby6sGzBTYT';
const AIRTABLE_AUDIT_TABLE = 'tblXL55K4V0LHwk2a';
const AIRTABLE_PAT = process.env.AIRTABLE_PAT;

async function airtablePost(fields) {
  if (!AIRTABLE_PAT) throw new Error('AIRTABLE_PAT is not configured');
  const response = await fetch('https://api.airtable.com/v0/' + AIRTABLE_BASE + '/' + AIRTABLE_AUDIT_TABLE, {
    method: 'POST',
    headers: { 'Authorization': 'Bearer ' + AIRTABLE_PAT, 'Content-Type': 'application/json' },
    body: JSON.stringify({ records: [{ fields }], typecast: true })
  });
  if (!response.ok) throw new Error('Airtable returned HTTP ' + response.status);
  return response.json();
}

async function sendEmail(message) {
  const result = await resend.emails.send(message);
  if (!result || result.error) {
    const message = result && result.error && result.error.message ? result.error.message : 'Resend did not confirm delivery';
    throw new Error(message);
  }
  return result.data;
}

exports.handler = async function(event) {
  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, body: 'Method Not Allowed' };
  }
  if (event.body && event.body.length > 20000) {
    return { statusCode: 413, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ error: 'Request too large' }) };
  }
  let body;
  try { body = JSON.parse(event.body); } catch (e) { return { statusCode: 400, body: 'Bad Request' }; }

  if (body.type === 'parent') {
    const { name, email, sport, age, goal, social } = body;
    const ageMap = { under14:'Under 14', hs:'14-17 (high school)', college:'18-22 (college)', pro:'Over 22 (early pro)' };
    const goalMap = { 'nil-now':'Starting NIL deals now', career:'Building a post-sport career plan', both:'NIL now + long-term income', literacy:'Financial literacy & business basics' };
    const socialMap = { tiny:'Under 500 followers', small:'500-5k followers', solid:'5k-25k followers', strong:'25k+ followers' };
    const deliveries = await Promise.allSettled([
      sendEmail({ from: FROM_EMAIL, to: email, subject: 'Welcome to Athletes of Life - You just took the first step', html: '<div style="background:#0A0A0A;color:#F5F5F0;font-family:Arial,sans-serif;max-width:600px;margin:0 auto;padding:40px 32px;"><div style="font-size:22px;font-weight:900;color:#C9A84C;letter-spacing:.08em;margin-bottom:28px;">ATHLETES OF LIFE</div><h1 style="font-size:26px;font-weight:700;margin-bottom:16px;">Hey ' + escapeHtml(name) + ' - glad you are here.</h1><p style="color:#aaa;font-size:15px;line-height:1.75;margin-bottom:20px;">I am Anthony Lever. Former pro basketball player - 15 years around the world - and son of NBA All-Star Lafayette "Fat" Lever. I built Athletes of Life because I know firsthand how unprepared most athletes are for life after sport.</p><div style="background:#111;border:1px solid #222;border-radius:12px;padding:24px;margin-bottom:28px;"><div style="font-size:11px;letter-spacing:.14em;text-transform:uppercase;color:#C9A84C;margin-bottom:12px;">Athlete Summary</div><table style="width:100%;border-collapse:collapse;"><tr><td style="padding:8px 0;color:#777;font-size:13px;border-bottom:1px solid #1a1a1a;">Sport</td><td style="padding:8px 0;font-size:13px;text-align:right;border-bottom:1px solid #1a1a1a;">' + escapeHtml(sport) + '</td></tr><tr><td style="padding:8px 0;color:#777;font-size:13px;border-bottom:1px solid #1a1a1a;">Age Range</td><td style="padding:8px 0;font-size:13px;text-align:right;border-bottom:1px solid #1a1a1a;">' + escapeHtml(ageMap[age]||age) + '</td></tr><tr><td style="padding:8px 0;color:#777;font-size:13px;border-bottom:1px solid #1a1a1a;">Goal</td><td style="padding:8px 0;font-size:13px;text-align:right;border-bottom:1px solid #1a1a1a;">' + escapeHtml(goalMap[goal]||goal) + '</td></tr><tr><td style="padding:8px 0;color:#777;font-size:13px;">Social</td><td style="padding:8px 0;font-size:13px;text-align:right;">' + escapeHtml(socialMap[social]||social) + '</td></tr></table></div><a href="' + CAL_LINK + '" style="display:inline-block;background:#C9A84C;color:#000;font-weight:700;font-size:15px;padding:14px 28px;border-radius:8px;text-decoration:none;margin-bottom:28px;">Book a Free Strategy Call</a><p style="color:#777;font-size:13px;border-top:1px solid #1a1a1a;padding-top:20px;">- Anthony Lever<br><span style="color:#555;">Founder, Athletes of Life - Elev8ed Innovation LLC</span></p></div>' }),
      sendEmail({ from: FROM_EMAIL, to: NOTIFY_EMAIL, subject: 'New Sports Parent Lead - ' + name + ' (' + sport + ')', html: '<div style="font-family:Arial,sans-serif;padding:24px;"><h2 style="color:#C9A84C;">New Sports Parent</h2><p><b>Name:</b> ' + escapeHtml(name) + '</p><p><b>Email:</b> ' + escapeHtml(email) + '</p><p><b>Sport:</b> ' + escapeHtml(sport) + '</p><p><b>Age:</b> ' + escapeHtml(ageMap[age]||age) + '</p><p><b>Goal:</b> ' + escapeHtml(goalMap[goal]||goal) + '</p><p><b>Social:</b> ' + escapeHtml(socialMap[social]||social) + '</p></div>' }),
      airtablePost({
        Name: name, Email: email, 'Business Stage': 'Idea',
        'Full Responses': 'Sport: ' + sport + ' | Age: ' + (ageMap[age]||age) + ' | Goal: ' + (goalMap[goal]||goal) + ' | Social: ' + (socialMap[social]||social),
        'Submitted At': new Date().toISOString().split('T')[0]
      })
    ]);
    return { statusCode: 200, body: JSON.stringify({ success: deliveries[0].status === 'fulfilled', emailSent: deliveries[0].status === 'fulfilled', logged: deliveries[2].status === 'fulfilled' }) };
  }

  if (body.type === 'nil') {
    const { name, email, sport, income, block, outcome } = body;
    const incomeMap = { zero:'No NIL yet', some:'Some deals but inconsistent', active:'Active NIL - want to scale', pro:'Pro salary - building for after', post:'Post-sport, replacing income' };
    const blockMap = { time:'No time - sport takes everything', idea:"Don't know what to sell", content:'Have ideas but no system', pipeline:'Need a pipeline built', tech:'Not technical enough' };
    const outcomeMap = { income:'Consistent monthly income', business:'A real business while I compete', foundation:'Foundation for after retirement', all:'All of the above - full system' };
    const deliveries = await Promise.allSettled([
      sendEmail({ from: FROM_EMAIL, to: email, subject: 'Welcome to Athletes of Life - your application is in', html: '<div style="background:#0A0A0A;color:#F5F5F0;font-family:Arial,sans-serif;max-width:600px;margin:0 auto;padding:40px 32px;"><div style="font-size:22px;font-weight:900;color:#C9A84C;letter-spacing:.08em;margin-bottom:28px;">ATHLETES OF LIFE</div><h1 style="font-size:26px;font-weight:700;margin-bottom:16px;">We got you, ' + escapeHtml(name) + '.</h1><p style="color:#aaa;font-size:15px;line-height:1.75;margin-bottom:20px;">I am Anthony Lever. 15 years as a pro basketball player. Son of NBA All-Star Lafayette "Fat" Lever. Your Done-For-You application just came through.</p><div style="background:#111;border:1px solid #222;border-radius:12px;padding:24px;margin-bottom:28px;"><div style="font-size:11px;letter-spacing:.14em;text-transform:uppercase;color:#C9A84C;margin-bottom:12px;">Your Application</div><table style="width:100%;border-collapse:collapse;"><tr><td style="padding:8px 0;color:#777;font-size:13px;border-bottom:1px solid #1a1a1a;">Sport</td><td style="padding:8px 0;font-size:13px;text-align:right;border-bottom:1px solid #1a1a1a;">' + escapeHtml(sport) + '</td></tr><tr><td style="padding:8px 0;color:#777;font-size:13px;border-bottom:1px solid #1a1a1a;">Situation</td><td style="padding:8px 0;font-size:13px;text-align:right;border-bottom:1px solid #1a1a1a;">' + escapeHtml(incomeMap[income]||income) + '</td></tr><tr><td style="padding:8px 0;color:#777;font-size:13px;border-bottom:1px solid #1a1a1a;">Bottleneck</td><td style="padding:8px 0;font-size:13px;text-align:right;border-bottom:1px solid #1a1a1a;">' + escapeHtml(blockMap[block]||block) + '</td></tr><tr><td style="padding:8px 0;color:#777;font-size:13px;">Outcome</td><td style="padding:8px 0;font-size:13px;text-align:right;">' + escapeHtml(outcomeMap[outcome]||outcome) + '</td></tr></table></div><a href="' + CAL_LINK + '" style="display:inline-block;background:#C9A84C;color:#000;font-weight:700;font-size:15px;padding:14px 28px;border-radius:8px;text-decoration:none;margin-bottom:28px;">Book Your Strategy Call</a><p style="color:#777;font-size:13px;border-top:1px solid #1a1a1a;padding-top:20px;">- Anthony Lever<br><span style="color:#555;">Founder, Athletes of Life - Elev8ed Innovation LLC</span></p></div>' }),
      sendEmail({ from: FROM_EMAIL, to: NOTIFY_EMAIL, subject: 'New Done-For-You Application - ' + name + ' (' + sport + ')', html: '<div style="font-family:Arial,sans-serif;padding:24px;"><h2 style="color:#C9A84C;">New DFY Application</h2><p><b>Name:</b> ' + escapeHtml(name) + '</p><p><b>Email:</b> ' + escapeHtml(email) + '</p><p><b>Sport:</b> ' + escapeHtml(sport) + '</p><p><b>Income:</b> ' + escapeHtml(incomeMap[income]||income) + '</p><p><b>Block:</b> ' + escapeHtml(blockMap[block]||block) + '</p><p><b>Outcome:</b> ' + escapeHtml(outcomeMap[outcome]||outcome) + '</p></div>' }),
      airtablePost({
        Name: name, Email: email,
        'Full Responses': 'Sport: ' + sport + ' | Income: ' + (incomeMap[income]||income) + ' | Block: ' + (blockMap[block]||block) + ' | Outcome: ' + (outcomeMap[outcome]||outcome),
        'Submitted At': new Date().toISOString().split('T')[0]
      })
    ]);
    return { statusCode: 200, body: JSON.stringify({ success: deliveries[0].status === 'fulfilled', emailSent: deliveries[0].status === 'fulfilled', logged: deliveries[2].status === 'fulfilled' }) };
  }

  let audit;
  try {
    audit = validateMainAudit(body);
  } catch (error) {
    return { statusCode: 400, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ error: error.message }) };
  }

  const copy = COPY[audit.language];
  const readinessLabel = getReadinessLabel(audit.totalScore, audit.language);
  const trackName = copy.tracks[audit.bestTrack];
  const scoresSummary = audit.scores.map((score, index) => copy.dimensions[index] + ': ' + score + '/10').join(', ');
  let auditText;
  let generatedByAi = false;

  try {
    const completion = await anthropic.messages.create({
      model: process.env.ANTHROPIC_MODEL || 'claude-sonnet-5',
      max_tokens: 700,
      messages: [{ role: 'user', content: buildPrompt(audit) }]
    });
    const textBlock = completion.content && completion.content.find(block => block.type === 'text');
    if (!textBlock || !textBlock.text) throw new Error('Anthropic returned no text');
    auditText = cleanAuditText(textBlock.text);
    generatedByAi = true;
  } catch (error) {
    console.error('Anthropic audit generation failed:', error && error.status, error && error.message);
    auditText = buildFallbackAudit(audit);
  }

  const emailCopy = audit.language === 'es' ? {
    subject: audit.name + ', tu diagnóstico de Athletes of Life está listo',
    greeting: 'Qué bueno tenerte aquí, ' + audit.name + '.',
    intro: 'Soy Anthony Lever. Jugué baloncesto profesional durante 15 años alrededor del mundo y soy hijo del NBA All-Star Lafayette "Fat" Lever. Creé Athletes of Life porque, cuando terminó mi carrera, nadie me entregó un playbook. Construí esto para que tú no tengas que descubrirlo todo solo.',
    score: 'Puntuación de preparación empresarial', auditLabel: 'Tu diagnóstico personalizado', dimensions: 'Puntuaciones por dimensión',
    next: 'Tu siguiente paso: reserva una llamada estratégica gratuita de 30 minutos conmigo. Convertiremos este diagnóstico en un plan real.',
    cta: 'Reserva tu llamada estratégica gratis'
  } : {
    subject: audit.name + ', welcome to Athletes of Life—your audit is inside',
    greeting: 'Glad you are here, ' + audit.name + '.',
    intro: 'I am Anthony Lever. I played professional basketball for 15 years around the world and I am the son of NBA All-Star Lafayette "Fat" Lever. I built Athletes of Life because when my career ended, nobody handed me a playbook. I built this so you do not have to figure it out alone.',
    score: 'Business Readiness Score', auditLabel: 'Your Personalized Audit', dimensions: 'Dimension Scores',
    next: 'Your next move: book a free 30-minute strategy call with me. We will map this audit into a real plan.',
    cta: 'Book Your Free Strategy Call'
  };

  const safeName = escapeHtml(audit.name);
  const safeSport = escapeHtml(audit.sport);
  const safeEmail = escapeHtml(audit.email);
  const safeReadiness = escapeHtml(readinessLabel);
  const safeTrack = escapeHtml(trackName);
  const dimRows = audit.scores.map((score, index) => '<tr><td style="padding:8px 0;color:#777;font-size:13px;border-bottom:1px solid #1a1a1a;">' + escapeHtml(copy.dimensions[index]) + '</td><td style="padding:8px 0;font-size:13px;text-align:right;border-bottom:1px solid #1a1a1a;color:#C9A84C;">' + score + '/10</td></tr>').join('');
  const auditParas = auditText.split(/\n\s*\n/).map(paragraph => '<p style="margin-bottom:14px;color:#ccc;font-size:15px;line-height:1.75;">' + escapeHtml(paragraph.trim()) + '</p>').join('');
  const athleteEmailHtml = '<div lang="' + audit.language + '" style="background:#0A0A0A;color:#F5F5F0;font-family:Arial,sans-serif;max-width:600px;margin:0 auto;padding:40px 32px;"><div style="font-size:22px;font-weight:900;color:#C9A84C;letter-spacing:.08em;margin-bottom:28px;">ATHLETES OF LIFE</div><h1 style="font-size:26px;font-weight:700;margin-bottom:16px;">' + escapeHtml(emailCopy.greeting) + '</h1><p style="color:#aaa;font-size:15px;line-height:1.75;margin-bottom:20px;">' + escapeHtml(emailCopy.intro) + '</p><div style="background:#111;border:1px solid #222;border-radius:16px;padding:32px;text-align:center;margin-bottom:28px;"><div style="font-size:11px;letter-spacing:.16em;text-transform:uppercase;color:#C9A84C;margin-bottom:12px;">' + safeReadiness + '</div><div style="font-size:64px;font-weight:900;color:#C9A84C;line-height:1;">' + audit.totalScore + '</div><div style="font-size:18px;color:#444;">/ 50</div><div style="font-size:14px;color:#777;margin-top:8px;">' + escapeHtml(emailCopy.score) + '</div></div><div style="background:#0f0f0f;border:1px solid #222;border-radius:12px;padding:24px;margin-bottom:24px;"><div style="font-size:11px;letter-spacing:.14em;text-transform:uppercase;color:#C9A84C;margin-bottom:16px;">' + escapeHtml(emailCopy.auditLabel) + '</div>' + auditParas + '</div><div style="background:#0f0f0f;border:1px solid #222;border-radius:12px;padding:24px;margin-bottom:24px;"><div style="font-size:11px;letter-spacing:.14em;text-transform:uppercase;color:#C9A84C;margin-bottom:12px;">' + escapeHtml(emailCopy.dimensions) + '</div><table style="width:100%;border-collapse:collapse;">' + dimRows + '</table></div><div style="background:linear-gradient(135deg,#141209,#0f0f0f);border:1px solid rgba(201,168,76,0.25);border-radius:12px;padding:24px;text-align:center;margin-bottom:24px;"><p style="font-size:15px;color:#ccc;line-height:1.75;margin-bottom:16px;">' + escapeHtml(emailCopy.next) + '</p><a href="' + CAL_LINK + '" style="display:inline-block;background:#C9A84C;color:#000;font-weight:700;font-size:15px;padding:14px 28px;border-radius:8px;text-decoration:none;">' + escapeHtml(emailCopy.cta) + '</a></div><p style="color:#777;font-size:13px;border-top:1px solid #1a1a1a;padding-top:20px;">— Anthony Lever<br><span style="color:#555;">Founder, Athletes of Life · Elev8ed Innovation LLC</span></p></div>';
  const notificationHtml = '<div style="font-family:Arial,sans-serif;padding:24px;"><h2 style="color:#C9A84C;">New Audit</h2><p><b>Name:</b> ' + safeName + '</p><p><b>Email:</b> ' + safeEmail + '</p><p><b>Language:</b> ' + audit.language.toUpperCase() + '</p><p><b>Sport:</b> ' + safeSport + '</p><p><b>Score:</b> ' + audit.totalScore + '/50 — ' + safeReadiness + '</p><p><b>Track:</b> ' + safeTrack + '</p><p><b>Scores:</b> ' + escapeHtml(scoresSummary) + '</p></div>';

  const deliveries = await Promise.allSettled([
    sendEmail({ from: FROM_EMAIL, to: audit.email, subject: emailCopy.subject, html: athleteEmailHtml }),
    sendEmail({ from: FROM_EMAIL, to: NOTIFY_EMAIL, subject: 'New Audit — ' + audit.name + ' (' + audit.sport + ') — ' + audit.totalScore + '/50 [' + audit.language.toUpperCase() + ']', html: notificationHtml }),
    airtablePost({
      Name: audit.name,
      Email: audit.email,
      'Business Stage': audit.totalScore >= 34 ? 'Growing' : audit.totalScore >= 15 ? 'Launching' : 'Idea',
      'Overall Score': audit.totalScore,
      'Full Responses': 'Language: ' + audit.language.toUpperCase() + ' | Sport: ' + audit.sport + ' | Income: ' + copy.income[audit.income] + ' | Track: ' + trackName + ' | Scores: ' + scoresSummary + '\n\n' + auditText,
      'Submitted At': new Date().toISOString().split('T')[0]
    })
  ]);

  deliveries.forEach((result, index) => {
    if (result.status === 'rejected') console.error(['Athlete email', 'Notification email', 'Airtable write'][index] + ' failed:', result.reason && result.reason.message);
  });

  const emailSent = deliveries[0].status === 'fulfilled';
  const logged = deliveries[2].status === 'fulfilled';
  const warnings = [];
  if (!emailSent) warnings.push('athlete_email_failed');
  if (deliveries[1].status !== 'fulfilled') warnings.push('notification_email_failed');
  if (!logged) warnings.push('airtable_write_failed');

  return {
    statusCode: 200,
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ audit: auditText, success: emailSent, emailSent, logged, generatedByAi, language: audit.language, warnings })
  };
};

exports._setClientsForTest = function(clients) {
  if (clients.anthropic) anthropic = clients.anthropic;
  if (clients.resend) resend = clients.resend;
};
