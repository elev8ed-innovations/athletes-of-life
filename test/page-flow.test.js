'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const read = file => fs.readFileSync(path.join(__dirname, '..', file), 'utf8');
const landing = read('index.html');
const audit = read('audit/index.html');

test('landing entry opens at the top and keeps the story inactive until Enter', () => {
  assert.match(landing, /<body class="entry-locked">/);
  assert.match(landing, /<div id="portal"/);
  assert.match(landing, /<div id="hub" class="show" inert>/);
  assert.match(landing, /hub\.removeAttribute\("inert"\)/);
  assert.match(landing, /window\.scrollTo\(0,0\)/);
  assert.match(landing, /event\.key==="Enter"/);
});

test('Investment leads into the restored Anthony welcome video', () => {
  const investment = landing.indexOf('data-en="Investment"');
  const bridge = landing.indexOf('class="aol-entry-bridge"');
  const welcome = landing.indexOf('id="welcome-video"');
  const welcomeClip = landing.indexOf('loom.com/embed/9ccfb1bc471645e48cb4eee2e18f83ae', welcome);
  const transition = landing.slice(bridge, welcome);

  assert.ok(investment >= 0 && investment < bridge && bridge < welcome);
  assert.ok(welcomeClip > welcome);
  assert.match(transition, /href="#welcome-video"/);
  assert.match(transition, /Watch the founder’s message/);
  assert.doesNotMatch(transition, /Enter the Platform/);
  assert.doesNotMatch(landing, /aol-drift/);
});

test('audit entry video precedes the audit CTA and results retain their follow-up video', () => {
  const homeStart = audit.indexOf('<div id="screen-home"');
  const homeEnd = audit.indexOf('</div><!-- /screen-home -->', homeStart);
  const resultsStart = audit.indexOf('<div id="screen-results"');
  const resultsEnd = audit.indexOf('</div><!-- /screen-results -->', resultsStart);
  const showResultsStart = audit.indexOf('function showResults(');
  const home = audit.slice(homeStart, homeEnd);
  const results = audit.slice(resultsStart, resultsEnd);

  assert.ok(homeStart >= 0 && homeEnd > homeStart);
  assert.ok(resultsStart >= 0 && resultsEnd > resultsStart);
  assert.ok(showResultsStart > resultsEnd);
  assert.ok(home.indexOf('loom.com/embed/9ccfb1bc471645e48cb4eee2e18f83ae') < home.indexOf('Take the Free Audit'));
  assert.match(results, /loom\.com\/embed\/0dfd3c90d188413abe9851afba607c5a/);
  assert.match(audit, /showResults\(data, payload\)/);
  assert.match(audit.slice(showResultsStart), /go\('results'\)/);
});
