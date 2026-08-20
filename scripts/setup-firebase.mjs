import { execFileSync } from 'node:child_process';
import { writeFileSync } from 'node:fs';

const projectId = process.argv[2] || 'julie-menu-top10';
const displayName = process.argv[3] || 'Julie Menu Top10';

function runFirebase(args, options = {}) {
  return execFileSync('npx', ['-y', 'firebase-tools@latest', ...args], {
    encoding: 'utf8',
    stdio: options.stdio || ['ignore', 'pipe', 'pipe'],
    ...options
  });
}

function parseJson(text) {
  return JSON.parse(text);
}

function listFromCliJson(text) {
  const parsed = parseJson(text);
  if (Array.isArray(parsed)) {
    return parsed;
  }
  if (parsed && Array.isArray(parsed.result)) {
    return parsed.result;
  }
  return [];
}

console.log(`Using Firebase project: ${projectId}`);

const projects = listFromCliJson(runFirebase(['projects:list', '--json']));
const hasProject = projects.some((item) => item.projectId === projectId);
if (!hasProject) {
  runFirebase(['projects:create', projectId, '--display-name', displayName], { stdio: 'inherit' });
}

runFirebase(['use', projectId], { stdio: 'inherit' });

const webApps = listFromCliJson(runFirebase(['apps:list', 'WEB', '--json']));
if (webApps.length === 0) {
  runFirebase(['apps:create', 'WEB', 'julie-menu'], { stdio: 'inherit' });
}

const appsAfterCreate = listFromCliJson(runFirebase(['apps:list', 'WEB', '--json']));
if (appsAfterCreate.length === 0) {
  throw new Error('No web app found after create.');
}

const webAppId = appsAfterCreate[0].appId;
const sdkRaw = runFirebase(['apps:sdkconfig', 'WEB', webAppId, '--json']);
const sdkParsed = parseJson(sdkRaw);
const sdk = sdkParsed.result ? sdkParsed.result.sdkConfig : sdkParsed.sdkConfig;
if (!sdk) {
  throw new Error('Could not read web SDK config.');
}

writeFileSync(
  'firebase-config.js',
  `export const firebaseConfig = ${JSON.stringify(sdk, null, 2)};\n`
);
console.log('Wrote firebase-config.js (keep this file local; it is gitignored)');

try {
  runFirebase(
    ['firestore:databases:create', '(default)', '--location=asia-east1', '--edition=standard'],
    { stdio: 'inherit' }
  );
} catch (error) {
  console.log('Firestore database may already exist; continuing.');
}

runFirebase(['deploy', '--only', 'firestore:rules,firestore:indexes,hosting'], { stdio: 'inherit' });

console.log('');
console.log('Done.');
console.log('Next: in Firebase Console -> Firestore, create document menu/current using firestore-seed.example.json');
console.log(`Hosting URL: https://${projectId}.web.app`);
