'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');

process.env.ANTHROPIC_API_KEY = 'test-anthropic-key';
process.env.RESEND_API_KEY = 'test-resend-key';
process.env.AIRTABLE_PAT = 'test-airtable-token';

test('Spanish handler flow generates, emails, and logs the server-calculated audit', async t => {
  const sentEmails = [];
  let generatedPrompt = '';
  let airtableRequest = null;
  const originalFetch = global.fetch;

  const auditFunction = require('../netlify/functions/send-audit');
  auditFunction._setClientsForTest({
    anthropic: {
      messages: {
        create: async request => {
          generatedPrompt = request.messages[0].content;
          return { content: [{ type: 'text', text: '# Diagnóstico\n\nLectura personalizada en español.\n\nTres acciones concretas.' }] };
        }
      }
    },
    resend: {
      emails: {
        send: async message => {
          sentEmails.push(message);
          return { data: { id: 'email-' + sentEmails.length }, error: null };
        }
      }
    }
  });
  global.fetch = async (url, options) => {
    airtableRequest = { url, options };
    return { ok: true, status: 200, json: async () => ({ records: [{ id: 'rec-test' }] }) };
  };
  t.after(() => { global.fetch = originalFetch; });

  const response = await auditFunction.handler({
    httpMethod: 'POST',
    body: JSON.stringify({
      name: 'Prueba Controlada',
      sport: 'Baloncesto',
      income: 'none',
      email: 'audit@example.com',
      scores: [9, 8, 7, 6, 5],
      totalScore: 1,
      bestTrack: 'Investment / Passive Income',
      language: 'es',
      company: ''
    })
  });

  const result = JSON.parse(response.body);
  assert.equal(response.statusCode, 200);
  assert.equal(result.emailSent, true);
  assert.equal(result.logged, true);
  assert.equal(result.generatedByAi, true);
  assert.equal(result.language, 'es');
  assert.doesNotMatch(result.audit, /^#/);
  assert.match(generatedPrompt, /Puntuación: 35\/50/);
  assert.match(generatedPrompt, /Ruta: Coaching \/ Consultoría/);
  assert.equal(sentEmails.length, 2);
  assert.match(sentEmails[0].subject, /tu diagnóstico/);
  assert.match(sentEmails[0].html, /Tu diagnóstico personalizado/);
  assert.ok(airtableRequest);
  const airtableBody = JSON.parse(airtableRequest.options.body);
  assert.match(airtableBody.records[0].fields['Full Responses'], /Language: ES/);
  assert.equal(airtableBody.records[0].fields['Overall Score'], 35);
});

test('handler reports an unconfirmed email instead of claiming success', async () => {
  const auditFunction = require('../netlify/functions/send-audit');
  auditFunction._setClientsForTest({
    anthropic: { messages: { create: async () => ({ content: [{ type: 'text', text: 'Valid audit text.' }] }) } },
    resend: { emails: { send: async () => ({ data: null, error: { message: 'Rejected' } }) } }
  });
  const originalFetch = global.fetch;
  global.fetch = async () => ({ ok: true, status: 200, json: async () => ({}) });

  try {
    const response = await auditFunction.handler({
      httpMethod: 'POST',
      body: JSON.stringify({ name: 'Test', sport: 'Basketball', income: 'none', email: 'audit@example.com', scores: [5, 5, 5, 5, 5], language: 'en', company: '' })
    });
    const result = JSON.parse(response.body);
    assert.equal(result.success, false);
    assert.equal(result.emailSent, false);
    assert.ok(result.warnings.includes('athlete_email_failed'));
  } finally {
    global.fetch = originalFetch;
  }
});
