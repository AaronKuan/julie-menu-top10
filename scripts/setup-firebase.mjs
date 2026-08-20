import { execSync } from 'node:child_process';
import { writeFileSync } from 'node:fs';
import { join } from 'node:path';

const projectId = process.argv[2] || 'digital-signage-menu-pim';
const displayName = process.argv[3] || 'Digital-Signage-Menu-PIM';
const npxCommand = process.platform === 'win32' ? 'npx.cmd' : 'npx';

function quoteArg(value) {
  if (!/[\s"]/.test(value)) {
    return value;
  }
  return `"${value.replace(/"/g, '\\"')}"`;
}

function extractSuccessJson(text) {
  const objectStart = text.indexOf('{');
  if (objectStart < 0) {
    return null;
  }
  try {
    return JSON.parse(text.slice(objectStart));
  } catch (error) {
    return null;
  }
}

function runFirebase(args, options = {}) {
  const command = `${npxCommand} -y firebase-tools@latest ${args.map(quoteArg).join(' ')}`;
  try {
    return execSync(command, {
      encoding: 'utf8',
      stdio: options.stdio || ['ignore', 'pipe', 'pipe'],
      windowsHide: true
    }) || '';
  } catch (error) {
    const text = `${error.stdout || ''}${error.stderr || ''}`;
    const parsed = extractSuccessJson(text);
    const windowsCliCrash = text.includes('UV_HANDLE_CLOSING');
    if (parsed && parsed.status === 'success') {
      return error.stdout || text;
    }
    if (windowsCliCrash && options.stdio === 'inherit') {
      console.log('Firebase CLI finished with a Windows-only process warning; continuing.');
      return '';
    }
    throw new Error(text.trim() || `Firebase command failed: ${args.join(' ')}`);
  }
}

function parseJson(text) {
  const parsed = extractSuccessJson(text);
  if (!parsed) {
    throw new Error(`Could not parse Firebase JSON output:\n${text}`);
  }
  return parsed;
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

execSync(`node "${join(process.cwd(), 'scripts', 'seed-menu.mjs')}" ${quoteArg(projectId)}`, {
  encoding: 'utf8',
  stdio: 'inherit',
  windowsHide: true
});

console.log('');
console.log('Done.');
console.log(`Hosting URL: https://${projectId}.web.app`);
