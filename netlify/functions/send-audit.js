const Anthropic = require('@anthropic-ai/sdk');
const { Resend } = require('resend');

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
const resend = new Resend(process.env.RESEND_API_KEY);
const FROM_EMAIL = 'hello@athletesoflife.online';
const NOTIFY_EMAIL = process.env.NOTIFY_EMAIL || 'a.lever.p7@gmail.com';
const CAL_LINK = 'https://calendly.com/admin-peptbiohacking/athletes-of-life-strategy-call';

// Airtable config
const AIRTABLE_BASE = 'app3b0yby6sGzBTYT';
const AIRTABLE_AUDIT_TABLE = 'tblXL55K4V0LHwk2a';
const AIRTABLE_PAT = process.env.AIRTABLE_PAT;

async function airtablePost(fields) {
  if (!AIRTABLE_PAT) return;
  try {
    await fetch('https://api.airtable.com/v0/' + AIRTABLE_BASE + '/' + AIRTABLE_AUDIT_TABLE, {
      method: 'POST',
      headers: { 'Authorization': 'Bearer ' + AIRTABLE_PAT, 'Content-Type': 'application/json' },
      body: JSON.stringify({ records: [{ fields }], typecast: true })
    });
  } catch (e) {
    console.error('Airtable write failed:', e);
  }
}

exports.handler = async function(event) {
  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, body: 'Method Not Allowed' };
  }
  let body;
  try { body = JSON.parse(event.body); } catch (e) { return { statusCode: 400, body: 'Bad Request' }; }

  if (body.type === 'parent') {
    const { name, email, sport, age, goal, social } = body;
    const ageMap = { under14:'Under 14', hs:'14-17 (high school)', college:'18-22 (college)', pro:'Over 22 (early pro)' };
    const goalMap = { 'nil-now':'Starting NIL deals now', career:'Building a post-sport career plan', both:'NIL now + long-term income', literacy:'Financial literacy & business basics' };
    const socialMap = { tiny:'Under 500 followers', small:'500-5k followers', solid:'5k-25k followers', strong:'25k+ followers' };
    await Promise.all([
      resend.emails.send({ from: FROM_EMAIL, to: email, subject: 'Welcome to Athletes of Life - You just took the first step', html: '<div style="background:#0A0A0A;color:#F5F5F0;font-family:Arial,sans-serif;max-width:600px;margin:0 auto;padding:40px 32px;"><div style="font-size:22px;font-weight:900;color:#C9A84C;letter-spacing:.08em;margin-bottom:28px;">ATHLETES OF LIFE</div><h1 style="font-size:26px;font-weight:700;margin-bottom:16px;">Hey ' + name + ' - glad you are here.</h1><p style="color:#aaa;font-size:15px;line-height:1.75;margin-bottom:20px;">I am Anthony Lever. Former pro basketball player - 15 years around the world - and son of NBA All-Star Lafayette "Fat" Lever. I built Athletes of Life because I know firsthand how unprepared most athletes are for life after sport.</p><div style="background:#111;border:1px solid #222;border-radius:12px;padding:24px;margin-bottom:28px;"><div style="font-size:11px;letter-spacing:.14em;text-transform:uppercase;color:#C9A84C;margin-bottom:12px;">Athlete Summary</div><table style="width:100%;border-collapse:collapse;"><tr><td style="padding:8px 0;color:#777;font-size:13px;border-bottom:1px solid #1a1a1a;">Sport</td><td style="padding:8px 0;font-size:13px;text-align:right;border-bottom:1px solid #1a1a1a;">' + sport + '</td></tr><tr><td style="padding:8px 0;color:#777;font-size:13px;border-bottom:1px solid #1a1a1a;">Age Range</td><td style="padding:8px 0;font-size:13px;text-align:right;border-bottom:1px solid #1a1a1a;">' + (ageMap[age]||age) + '</td></tr><tr><td style="padding:8px 0;color:#777;font-size:13px;border-bottom:1px solid #1a1a1a;">Goal</td><td style="padding:8px 0;font-size:13px;text-align:right;border-bottom:1px solid #1a1a1a;">' + (goalMap[goal]||goal) + '</td></tr><tr><td style="padding:8px 0;color:#777;font-size:13px;">Social</td><td style="padding:8px 0;font-size:13px;text-align:right;">' + (socialMap[social]||social) + '</td></tr></table></div><a href="' + CAL_LINK + '" style="display:inline-block;background:#C9A84C;color:#000;font-weight:700;font-size:15px;padding:14px 28px;border-radius:8px;text-decoration:none;margin-bottom:28px;">Book a Free Strategy Call</a><p style="color:#777;font-size:13px;border-top:1px solid #1a1a1a;padding-top:20px;">- Anthony Lever<br><span style="color:#555;">Founder, Athletes of Life - Elev8ed Innovation LLC</span></p></div>' }),
      resend.emails.send({ from: FROM_EMAIL, to: NOTIFY_EMAIL, subject: 'New Sports Parent Lead - ' + name + ' (' + sport + ')', html: '<div style="font-family:Arial,sans-serif;padding:24px;"><h2 style="color:#C9A84C;">New Sports Parent</h2><p><b>Name:</b> ' + name + '</p><p><b>Email:</b> ' + email + '</p><p><b>Sport:</b> ' + sport + '</p><p><b>Age:</b> ' + (ageMap[age]||age) + '</p><p><b>Goal:</b> ' + (goalMap[goal]||goal) + '</p><p><b>Social:</b> ' + (socialMap[social]||social) + '</p></div>' }),
      airtablePost({
        Name: name, Email: email, 'Business Stage': 'Idea',
        'Full Responses': 'Sport: ' + sport + ' | Age: ' + (ageMap[age]||age) + ' | Goal: ' + (goalMap[goal]||goal) + ' | Social: ' + (socialMap[social]||social),
        'Submitted At': new Date().toISOString().split('T')[0]
      })
    ]);
    return { statusCode: 200, body: JSON.stringify({ success: true }) };
  }

  if (body.type === 'nil') {
    const { name, email, sport, income, block, outcome } = body;
    const incomeMap = { zero:'No NIL yet', some:'Some deals but inconsistent', active:'Active NIL - want to scale', pro:'Pro salary - building for after', post:'Post-sport, replacing income' };
    const blockMap = { time:'No time - sport takes everything', idea:"Don't know what to sell", content:'Have ideas but no system', pipeline:'Need a pipeline built', tech:'Not technical enough' };
    const outcomeMap = { income:'Consistent monthly income', business:'A real business while I compete', foundation:'Foundation for after retirement', all:'All of the above - full system' };
    await Promise.all([
      resend.emails.send({ from: FROM_EMAIL, to: email, subject: 'Welcome to Athletes of Life - your application is in', html: '<div style="background:#0A0A0A;color:#F5F5F0;font-family:Arial,sans-serif;max-width:600px;margin:0 auto;padding:40px 32px;"><div style="font-size:22px;font-weight:900;color:#C9A84C;letter-spacing:.08em;margin-bottom:28px;">ATHLETES OF LIFE</div><h1 style="font-size:26px;font-weight:700;margin-bottom:16px;">We got you, ' + name + '.</h1><p style="color:#aaa;font-size:15px;line-height:1.75;margin-bottom:20px;">I am Anthony Lever. 15 years as a pro basketball player. Son of NBA All-Star Lafayette "Fat" Lever. Your Done-For-You application just came through.</p><div style="background:#111;border:1px solid #222;border-radius:12px;padding:24px;margin-bottom:28px;"><div style="font-size:11px;letter-spacing:.14em;text-transform:uppercase;color:#C9A84C;margin-bottom:12px;">Your Application</div><table style="width:100%;border-collapse:collapse;"><tr><td style="padding:8px 0;color:#777;font-size:13px;border-bottom:1px solid #1a1a1a;">Sport</td><td style="padding:8px 0;font-size:13px;text-align:right;border-bottom:1px solid #1a1a1a;">' + sport + '</td></tr><tr><td style="padding:8px 0;color:#777;font-size:13px;border-bottom:1px solid #1a1a1a;">Situation</td><td style="padding:8px 0;font-size:13px;text-align:right;border-bottom:1px solid #1a1a1a;">' + (incomeMap[income]||income) + '</td></tr><tr><td style="padding:8px 0;color:#777;font-size:13px;border-bottom:1px solid #1a1a1a;">Bottleneck</td><td style="padding:8px 0;font-size:13px;text-align:right;border-bottom:1px solid #1a1a1a;">' + (blockMap[block]||block) + '</td></tr><tr><td style="padding:8px 0;color:#777;font-size:13px;">Outcome</td><td style="padding:8px 0;font-size:13px;text-align:right;">' + (outcomeMap[outcome]||outcome) + '</td></tr></table></div><a href="' + CAL_LINK + '" style="display:inline-block;background:#C9A84C;color:#000;font-weight:700;font-size:15px;padding:14px 28px;border-radius:8px;text-decoration:none;margin-bottom:28px;">Book Your Strategy Call</a><p style="color:#777;font-size:13px;border-top:1px solid #1a1a1a;padding-top:20px;">- Anthony Lever<br><span style="color:#555;">Founder, Athletes of Life - Elev8ed Innovation LLC</span></p></div>' }),
      resend.emails.send({ from: FROM_EMAIL, to: NOTIFY_EMAIL, subject: 'New Done-For-You Application - ' + name + ' (' + sport + ')', html: '<div style="font-family:Arial,sans-serif;padding:24px;"><h2 style="color:#C9A84C;">New DFY Application</h2><p><b>Name:</b> ' + name + '</p><p><b>Email:</b> ' + email + '</p><p><b>Sport:</b> ' + sport + '</p><p><b>Income:</b> ' + (incomeMap[income]||income) + '</p><p><b>Block:</b> ' + (blockMap[block]||block) + '</p><p><b>Outcome:</b> ' + (outcomeMap[outcome]||outcome) + '</p></div>' }),
      airtablePost({
        Name: name, Email: email,
        'Full Responses': 'Sport: ' + sport + ' | Income: ' + (incomeMap[income]||income) + ' | Block: ' + (blockMap[block]||block) + ' | Outcome: ' + (outcomeMap[outcome]||outcome),
        'Submitted At': new Date().toISOString().split('T')[0]
      })
    ]);
    return { statusCode: 200, body: JSON.stringify({ success: true }) };
  }

  const { name, sport, income, email, scores, totalScore, bestTrack } = body;
  const incomeLabels = { none:'no income yet', scholarship:'scholarship only', 'nil-small':'some NIL under $5k/yr', 'nil-active':'active NIL ($5k-$50k/yr)', pro:'a pro contract or salary', post:'post-sport, rebuilding income' };
  const dimensionNames = ['On-Camera Presence','Teaching / Coaching','Available Time','Money & Investing','Network / Audience'];

  function getVenue(s) {
    s = (s||'').toLowerCase();
    if (s.includes('football')) return 'field';
    if (s.includes('baseball')||s.includes('softball')) return 'diamond';
    if (s.includes('soccer')) return 'pitch';
    if (s.includes('hockey')) return 'rink';
    if (s.includes('swim')||s.includes('pool')) return 'pool';
    if (s.includes('track')||s.includes('cross country')) return 'track';
    if (s.includes('golf')) return 'course';
    return 'court';
  }
  const venue = getVenue(sport);
  const scoresSummary = scores.map(function(s,i) { return dimensionNames[i] + ': ' + s + '/10'; }).join(', ');

  const prompt = 'You are a sharp business coach who specializes in helping athletes build income. Write a personalized 250-word business readiness audit. Be direct, specific, motivating - peer to peer, not consultant.\n\nAthlete: ' + name + ' | Sport: ' + sport + ' | Income: ' + (incomeLabels[income]||income) + ' | Score: ' + totalScore + '/50 | Dimensions: ' + scoresSummary + ' | Track: ' + bestTrack + ' | Venue word: ' + venue + '\n\nWrite 3 paragraphs:\n1. Honest read on their scores\n2. Why ' + bestTrack + ' is their best move\n3. Three concrete moves THIS WEEK\n\nUse their name. Use "' + venue + '" not "court". No fluff.';

  let auditText = '';
  try {
    const completion = await anthropic.messages.create({ model: 'claude-sonnet-5', max_tokens: 600, messages: [{ role: 'user', content: prompt }] });
    auditText = completion.content[0].text.replace(/\*\*(.*?)\*\*/g, '$1').replace(/\*(.*?)\*/g, '$1');
  } catch(e) {
    console.error('Anthropic audit generation failed:', e && e.status, e && e.message);
    auditText = name + ', here is your honest read.\n\nYou scored ' + totalScore + ' out of 50. The discipline you built in ' + sport + ' already gives you an edge. Your scores point to the ' + bestTrack + ' track.\n\nThree moves this week: commit to the track, block two hours for the first module, post once about your athletic identity.';
  }

  const readinessLabel = totalScore>=42?'Elite Readiness':totalScore>=34?'High Readiness':totalScore>=25?'Strong Foundation':totalScore>=15?'Building Momentum':'Starting Strong';
  const dimRows = scores.map(function(s,i) { return '<tr><td style="padding:8px 0;color:#777;font-size:13px;border-bottom:1px solid #1a1a1a;">' + dimensionNames[i] + '</td><td style="padding:8px 0;font-size:13px;text-align:right;border-bottom:1px solid #1a1a1a;color:#C9A84C;">' + s + '/10</td></tr>'; }).join('');
  const auditParas = auditText.split('\n\n').map(function(p) { return '<p style="margin-bottom:14px;color:#ccc;font-size:15px;line-height:1.75;">' + p.trim() + '</p>'; }).join('');

  await Promise.all([
    resend.emails.send({ from: FROM_EMAIL, to: email, subject: name + ', welcome to Athletes of Life - your audit is inside', html: '<div style="background:#0A0A0A;color:#F5F5F0;font-family:Arial,sans-serif;max-width:600px;margin:0 auto;padding:40px 32px;"><div style="font-size:22px;font-weight:900;color:#C9A84C;letter-spacing:.08em;margin-bottom:28px;">ATHLETES OF LIFE</div><h1 style="font-size:26px;font-weight:700;margin-bottom:16px;">Glad you are here, ' + name + '.</h1><p style="color:#aaa;font-size:15px;line-height:1.75;margin-bottom:20px;">I am Anthony Lever. 15 years as a pro basketball player around the world. Son of NBA All-Star Lafayette "Fat" Lever. I built Athletes of Life because when my career ended, nobody handed me a playbook. I built this so you do not have to figure it out alone.</p><div style="background:#111;border:1px solid #222;border-radius:16px;padding:32px;text-align:center;margin-bottom:28px;"><div style="font-size:11px;letter-spacing:.16em;text-transform:uppercase;color:#C9A84C;margin-bottom:12px;">' + readinessLabel + '</div><div style="font-size:64px;font-weight:900;color:#C9A84C;line-height:1;">' + totalScore + '</div><div style="font-size:18px;color:#444;">/ 50</div><div style="font-size:14px;color:#777;margin-top:8px;">Business Readiness Score</div></div><div style="background:#0f0f0f;border:1px solid #222;border-radius:12px;padding:24px;margin-bottom:24px;"><div style="font-size:11px;letter-spacing:.14em;text-transform:uppercase;color:#C9A84C;margin-bottom:16px;">Your Personalized Audit</div>' + auditParas + '</div><div style="background:#0f0f0f;border:1px solid #222;border-radius:12px;padding:24px;margin-bottom:24px;"><div style="font-size:11px;letter-spacing:.14em;text-transform:uppercase;color:#C9A84C;margin-bottom:12px;">Dimension Scores</div><table style="width:100%;border-collapse:collapse;">' + dimRows + '</table></div><div style="background:linear-gradient(135deg,#141209,#0f0f0f);border:1px solid rgba(201,168,76,0.25);border-radius:12px;padding:24px;text-align:center;margin-bottom:24px;"><p style="font-size:15px;color:#ccc;line-height:1.75;margin-bottom:16px;">Your next move: book a free 30-min strategy call with me. We will map this audit into a real plan.</p><a href="' + CAL_LINK + '" style="display:inline-block;background:#C9A84C;color:#000;font-weight:700;font-size:15px;padding:14px 28px;border-radius:8px;text-decoration:none;">Book Your Free Strategy Call</a></div><p style="color:#777;font-size:13px;border-top:1px solid #1a1a1a;padding-top:20px;">- Anthony Lever<br><span style="color:#555;">Founder, Athletes of Life - Elev8ed Innovation LLC</span></p></div>' }),
    resend.emails.send({ from: FROM_EMAIL, to: NOTIFY_EMAIL, subject: 'New Audit - ' + name + ' (' + sport + ') - ' + totalScore + '/50', html: '<div style="font-family:Arial,sans-serif;padding:24px;"><h2 style="color:#C9A84C;">New Audit</h2><p><b>Name:</b> ' + name + '</p><p><b>Email:</b> ' + email + '</p><p><b>Sport:</b> ' + sport + '</p><p><b>Score:</b> ' + totalScore + '/50 - ' + readinessLabel + '</p><p><b>Track:</b> ' + bestTrack + '</p><p><b>Scores:</b> ' + scoresSummary + '</p></div>' }),
    airtablePost({
      Name: name, Email: email,
      'Business Stage': totalScore >= 34 ? 'Growing' : totalScore >= 15 ? 'Launching' : 'Idea',
      'Overall Score': totalScore,
      'Full Responses': 'Sport: ' + sport + ' | Income: ' + (incomeLabels[income]||income) + ' | Track: ' + bestTrack + ' | Scores: ' + scoresSummary + '\n\n' + auditText,
      'Submitted At': new Date().toISOString().split('T')[0]
    })
  ]);

  return { statusCode: 200, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ audit: auditText, success: true }) };
};
