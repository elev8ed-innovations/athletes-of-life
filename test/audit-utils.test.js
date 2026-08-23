'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const {
  buildPrompt,
  cleanAuditText,
  escapeHtml,
  validateMainAudit
} = require('../netlify/functions/audit-utils');

const baseAudit = {
  name: 'Codex Controlled Test',
  sport: 'Basketball',
  income: 'none',
  email: 'audit@example.com',
  scores: [9, 8, 7, 6, 5],
  totalScore: 1,
  bestTrack: 'Investment / Passive Income',
  company: ''
};

test('server recalculates the total and track instead of trusting the browser', () => {
  const result = validateMainAudit({ ...baseAudit, language: 'en' });
  assert.equal(result.totalScore, 35);
  assert.equal(result.bestTrack, 'Coaching / Consulting');
});

test('Spanish submissions produce an explicit Latin American Spanish prompt', () => {
  const audit = validateMainAudit({ ...baseAudit, language: 'es', sport: 'Baloncesto' });
  const prompt = buildPrompt(audit);
  assert.match(prompt, /completamente en español latinoamericano natural/i);
  assert.match(prompt, /Coaching \/ Consultoría/);
  assert.doesNotMatch(prompt, /Write exactly 3 paragraphs/);
});

test('English submissions retain the English generation path', () => {
  const audit = validateMainAudit({ ...baseAudit, language: 'en' });
  const prompt = buildPrompt(audit);
  assert.match(prompt, /Write exactly 3 paragraphs/);
  assert.doesNotMatch(prompt, /completamente en español/);
});

test('invalid scores and bot honeypot submissions are rejected', () => {
  assert.throws(() => validateMainAudit({ ...baseAudit, scores: [9, 8, 7, 6, 99] }), /scores/i);
  assert.throws(() => validateMainAudit({ ...baseAudit, company: 'bot value' }), /Invalid submission/);
});

test('generated copy is cleaned and escaped before rendering', () => {
  assert.equal(cleanAuditText('# Business Readiness Audit\n\n**Strong** start.'), 'Business Readiness Audit\n\nStrong start.');
  assert.equal(escapeHtml('<img src=x onerror=alert(1)>'), '&lt;img src=x onerror=alert(1)&gt;');
});
