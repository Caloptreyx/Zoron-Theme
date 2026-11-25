import assert from 'node:assert/strict';
import { existsSync, readFileSync } from 'node:fs';
import { test } from 'node:test';
import { normalizeTheme } from '../frontend/src/lib/theme.ts';

test('email branding defaults and saved controls survive normalization', () => {
  const defaults = normalizeTheme({});
  assert.equal(defaults.emailSync, true);
  assert.equal(defaults.emailLogo, '');
  assert.equal(defaults.emailFooter, '');
  const draft = normalizeTheme({ emailSync: false, emailLogo: '/assets/logo.png', emailFooter: ' Panel team ' });
  assert.deepEqual(normalizeTheme(JSON.parse(JSON.stringify(draft))), draft);
  assert.equal(draft.emailSync, false);
  assert.equal(draft.emailLogo, '/assets/logo.png');
  assert.equal(draft.emailFooter, 'Panel team');
  assert.equal(normalizeTheme({ emailLogo: 'https://example.com/{{bad}}' }).emailLogo, '');
});

test('the ten core mails use a shared Carbon layout without changing delivery defaults', () => {
  const mail = new URL('../backend/src/mail.rs', import.meta.url);
  assert.ok(existsSync(mail), 'core mail registration is missing');
  const source = readFileSync(mail, 'utf8');
  for (const id of [
    'account_created', 'password_reset', 'email_verification', 'two_factor_code', 'session_created',
    'connection_test', 'added_to_server', 'removed_from_server', 'server_installed', 'server_restored',
  ]) {
    assert.match(source, new RegExp(`"${id}"`));
  }
  assert.match(source, /template\.default_content = content/);
  assert.doesNotMatch(source, /template\.default_(?:subject|enabled)\s*=/);
  const html = readFileSync(new URL('../backend/mails/carbon.html', import.meta.url), 'utf8');
  for (const token of ['reset_link', 'verification_link', 'server_link', 'sessions_link', 'code', 'ip', 'user_agent']) {
    assert.match(html, new RegExp(`\\b${token}\\b`));
  }
  assert.match(html, /<table role="presentation"/);
  assert.doesNotMatch(html, /\{\{\s*server\./);
});
