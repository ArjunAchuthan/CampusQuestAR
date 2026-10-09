import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const configPath = path.join(os.homedir(), '.config', 'configstore', 'firebase-tools.json');
const config = JSON.parse(fs.readFileSync(configPath, 'utf8'));
const authModule = require('C:/Users/hp/AppData/Roaming/npm/node_modules/firebase-tools/lib/auth.js');

async function getValidToken() {
  const t = await authModule.getAccessToken(config.tokens.refresh_token, config.tokens.scopes || []);
  return t.access_token;
}

async function makeAdmin(targetEmailOrUid) {
  const token = await getValidToken();
  const projectId = 'campusquestar-app';

  console.log(`Setting admin privileges for: ${targetEmailOrUid}...`);

  // 1. If it's an email or uid, write to admins/{targetEmailOrUid}
  const cleanId = targetEmailOrUid.trim();
  const docRes = await fetch(`https://firestore.googleapis.com/v1/projects/${projectId}/databases/(default)/documents/admins/${encodeURIComponent(cleanId)}`, {
    method: 'PATCH',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      fields: {
        adminId: { stringValue: cleanId },
        createdAt: { timestampValue: new Date().toISOString() },
      },
    }),
  });

  const data = await docRes.json();
  if (data.name) {
    console.log(`Successfully added "${cleanId}" to admins collection!`);
  } else {
    console.error('Error adding admin:', data);
  }
}

const target = process.argv[2] || 'admin@campusquest.test';
makeAdmin(target);
