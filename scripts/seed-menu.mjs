import { readFileSync } from 'node:fs';
import { homedir } from 'node:os';
import { join } from 'node:path';

const projectId = process.argv[2] || 'digital-signage-menu-pim';
const FIREBASE_CLI_CLIENT_ID = '563584335869-fgrhgmd47bqnekij5i8b5pr03ho849e2.apps.googleusercontent.com';
const FIREBASE_CLI_CLIENT_SECRET = 'jEQPZ7uNExSMv0j7';

function loadSeed() {
  return JSON.parse(readFileSync(new URL('../firestore-seed.example.json', import.meta.url), 'utf8'));
}

function toFirestoreValue(value) {
  if (typeof value === 'string') {
    return { stringValue: value };
  }
  if (value && typeof value === 'object' && !Array.isArray(value)) {
    const fields = {};
    for (const [key, nested] of Object.entries(value)) {
      fields[key] = toFirestoreValue(nested);
    }
    return { mapValue: { fields } };
  }
  throw new Error(`Unsupported seed value: ${JSON.stringify(value)}`);
}

function findRefreshToken() {
  const candidates = [
    join(homedir(), '.config', 'configstore', 'firebase-tools.json'),
    join(homedir(), 'AppData', 'Roaming', 'configstore', 'firebase-tools.json')
  ];

  for (const filePath of candidates) {
    try {
      const parsed = JSON.parse(readFileSync(filePath, 'utf8'));
      const token = parsed.tokens?.refresh_token || parsed.refresh_token;
      if (typeof token === 'string' && token.length > 0) {
        return token;
      }
    } catch (error) {
      if (error && error.code !== 'ENOENT') {
        console.log(`Skipped ${filePath}: ${error.message}`);
      }
    }
  }

  throw new Error('找不到 Firebase 登入憑證。請先執行：npx -y firebase-tools@latest login');
}

async function getAccessToken(refreshToken) {
  const body = new URLSearchParams({
    client_id: FIREBASE_CLI_CLIENT_ID,
    client_secret: FIREBASE_CLI_CLIENT_SECRET,
    refresh_token: refreshToken,
    grant_type: 'refresh_token'
  });

  const response = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body
  });
  const payload = await response.json();
  if (!response.ok || typeof payload.access_token !== 'string') {
    throw new Error(`無法取得 Google 存取權：${JSON.stringify(payload)}`);
  }
  return payload.access_token;
}

async function upsertMenuDocument(accessToken, seed) {
  const documentName = `projects/${projectId}/databases/(default)/documents/menu/current`;
  const response = await fetch(
    `https://firestore.googleapis.com/v1/projects/${projectId}/databases/(default)/documents:commit`,
    {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        writes: [
          {
            update: {
              name: documentName,
              fields: {
                slideA: toFirestoreValue(seed.slideA),
                slideB: toFirestoreValue(seed.slideB),
                slideC: toFirestoreValue(seed.slideC)
              }
            }
          }
        ]
      })
    }
  );

  const payload = await response.json();
  if (!response.ok) {
    throw new Error(`寫入 Firestore 失敗：${JSON.stringify(payload)}`);
  }
  return payload;
}

const seed = loadSeed();
const accessToken = await getAccessToken(findRefreshToken());
await upsertMenuDocument(accessToken, seed);
console.log(`Wrote menu/current in ${projectId}`);
console.log('Open Firebase Console → Firestore → menu / current to confirm the fields.');
