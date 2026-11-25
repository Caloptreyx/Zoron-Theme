import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { test } from 'node:test';
import { DEFAULT_THEME, normalizeTheme } from '../frontend/src/lib/theme.ts';

test('Zoron email templates are off unless a theme turns them on', () => {
  assert.equal(DEFAULT_THEME.emailTemplates, false);
  // themes saved by 1.0.8 and before have no field: off
  assert.equal(normalizeTheme({}).emailTemplates, false);
  assert.equal(normalizeTheme({ accent: '#123456', emailSync: true }).emailTemplates, false);
  assert.equal(normalizeTheme({ emailTemplates: 'yes' }).emailTemplates, false);
  const on = normalizeTheme({ emailTemplates: true });
  assert.equal(on.emailTemplates, true);
  assert.deepEqual(normalizeTheme(JSON.parse(JSON.stringify(on))), on);
});

test('email branding defaults and saved controls survive normalization', () => {
  const defaults = normalizeTheme({});
  assert.equal(defaults.emailSync, true);
  assert.equal(defaults.emailLogo, '');
  assert.equal(defaults.emailFooter, '');
  const draft = normalizeTheme({
    emailTemplates: true,
    emailSync: false,
    emailLogo: '/assets/logo.png',
    emailFooter: ' Panel team ',
  });
  assert.deepEqual(normalizeTheme(JSON.parse(JSON.stringify(draft))), draft);
  assert.equal(draft.emailSync, false);
  assert.equal(draft.emailLogo, '/assets/logo.png');
  assert.equal(draft.emailFooter, 'Panel team');
  assert.equal(normalizeTheme({ emailLogo: 'https://example.com/{{bad}}' }).emailLogo, '');
});

test('the layout covers the ten core mails and never replaces the panel defaults', () => {
  const source = readFileSync(new URL('../backend/src/mail.rs', import.meta.url), 'utf8');
  for (const id of [
    'account_created',
    'password_reset',
    'email_verification',
    'two_factor_code',
    'session_created',
    'connection_test',
    'added_to_server',
    'removed_from_server',
    'server_installed',
    'server_restored',
  ]) {
    assert.match(source, new RegExp(`"${id}"`));
  }
  // the panel's own content stays the default; the layout is only ever stored, while the setting is on
  assert.doesNotMatch(source, /\.default_(?:content|subject|enabled)\s*=[^=>]/);
  const html = readFileSync(new URL('../backend/mails/carbon.html', import.meta.url), 'utf8');
  for (const token of ['reset_link', 'verification_link', 'server_link', 'sessions_link', 'code', 'ip', 'user_agent']) {
    assert.match(html, new RegExp(`\\b${token}\\b`));
  }
  assert.match(html, /<table role="presentation"/);
  assert.doesNotMatch(html, /\{\{\s*server\./);
});
