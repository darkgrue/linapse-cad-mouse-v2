#!/usr/bin/env node
import { readFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import chromeWebstoreUpload from 'chrome-webstore-upload';

const __dirname = dirname(fileURLToPath(import.meta.url));
const EXT_DIR = resolve(__dirname, '..');
const ROOT = resolve(EXT_DIR, '..');
const VERSION = readFileSync(join(ROOT, 'VERSION'), 'utf8').trim();
const meta = JSON.parse(readFileSync(join(EXT_DIR, 'extension-id.json'), 'utf8'));

const clientId = process.env.CHROME_CLIENT_ID;
const clientSecret = process.env.CHROME_CLIENT_SECRET;
const refreshToken = process.env.CHROME_REFRESH_TOKEN;
const extensionId = process.env.CHROME_EXTENSION_ID || meta.chrome_extension_id;

if (!extensionId) {
  console.error('Missing CHROME_EXTENSION_ID.');
  console.error('');
  console.error('Google assigns an extension ID on your first manual Developer Dashboard upload.');
  console.error('After uploading, copy the Item ID and set GitHub secret CHROME_EXTENSION_ID,');
  console.error('or fill extension/extension-id.json → chrome_extension_id.');
  console.error('');
  console.error('See docs/BROWSER_EXTENSION.md (Part H).');
  process.exit(1);
}

for (const [name, value] of Object.entries({
  CHROME_CLIENT_ID: clientId,
  CHROME_CLIENT_SECRET: clientSecret,
  CHROME_REFRESH_TOKEN: refreshToken,
})) {
  if (!value) {
    console.error(`Missing required secret/env: ${name}`);
    process.exit(1);
  }
}

const zipPath = join(EXT_DIR, 'dist', `linapse-browser-connector-chrome-${VERSION}.zip`);
const zipBuffer = readFileSync(zipPath);

const store = chromeWebstoreUpload({
  extensionId,
  clientId,
  clientSecret,
  refreshToken,
});

console.log(`Uploading ${zipPath} to Chrome Web Store (${extensionId})...`);

try {
  await store.uploadExisting(zipBuffer);
} catch (error) {
  const response = error.response ?? {};
  const apiError = response.error ?? {};
  if (apiError.code === 404 || apiError.message === 'Not Found') {
    console.error('');
    console.error('Chrome Web Store returned 404 Not Found for extension ID:', extensionId);
    console.error('');
    console.error('This almost always means the extension item does not exist yet in your');
    console.error('Developer Dashboard. Google requires the FIRST upload to be manual.');
    console.error('');
    console.error('Fix (one-time):');
    console.error('  1. Open https://chrome.google.com/webstore/devconsole');
    console.error('  2. Click "New item"');
    console.error('  3. Upload the zip from this repo:');
    console.error(`     extension/dist/linapse-browser-connector-chrome-${VERSION}.zip`);
    console.error('  4. Confirm the Item ID shown matches:', extensionId);
    console.error('     If it differs, update the CHROME_EXTENSION_ID GitHub secret.');
    console.error('  5. Re-run CI (or push again) after the manual upload succeeds.');
    console.error('');
    console.error('Also verify the Google account for OAuth (refresh token) is the SAME');
    console.error('account that owns the Developer Dashboard item.');
    console.error('');
    console.error('Full guide: docs/BROWSER_EXTENSION.md (Part H)');
    process.exit(2);
  }
  throw error;
}

console.log('Upload complete. Publishing to trusted testers/default channel...');
await store.publish();
console.log('Chrome Web Store publish complete.');
