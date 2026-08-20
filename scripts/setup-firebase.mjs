import { spawnSync } from 'node:child_process';
import { writeFileSync } from 'node:fs';

const projectId = process.argv[2] || 'julie-menu-top10';
const displayName = process.argv[3] || 'Julie Menu Top10';
const npxCommand = process.platform === 'win32' ? 'npx.cmd' : 'npx';

function runFirebase(args, options = {}) {
  const result = spawnSync(npxCommand, ['-y', 'firebase-tools@latest', ...args], {
    encoding: 'utf8',
    shell: process.platform === 'win32',
    stdio: options.stdio || ['ignore', 'pipe', 'pipe']
  });

  if (result.error) {
    throw result.error;
  }
  if (result.status !== 0) {
    const details = `${result.stderr || ''}${result.stdout || ''}`.trim();
    throw new Error(details || `Firebase command failed: ${args.join(' ')}`);
  }
  return result.stdout || '';
}

function parseJson(text) {
  const objectStart = text.indexOf('{');
  const arrayStart = text.indexOf('[');
  let start = -1;
  if (objectStart >= 0 && arrayStart >= 0) {
    start = Math.min(objectStart, arrayStart);
  } else {
    start = Math.max(objectStart, arrayStart);
  }
  const sliced = start >= 0 ? text.slice(start) : text;
  return JSON.parse(sliced);
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
