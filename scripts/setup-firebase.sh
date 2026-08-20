#!/usr/bin/env bash
set -euo pipefail

# Creates (or reuses) the Firebase project, web app, Firestore, Hosting, and local web config.
# Requires: you already ran `npx -y firebase-tools@latest login` on this machine.

PROJECT_ID="${1:-julie-menu-top10}"
DISPLAY_NAME="${2:-Julie Menu Top10}"
FIREBASE="npx -y firebase-tools@latest"

echo "Using Firebase project: ${PROJECT_ID}"

if ! ${FIREBASE} projects:list --json 2>/dev/null | grep -q "\"projectId\": \"${PROJECT_ID}\""; then
  ${FIREBASE} projects:create "${PROJECT_ID}" --display-name "${DISPLAY_NAME}"
fi

${FIREBASE} use "${PROJECT_ID}"

if ! ${FIREBASE} apps:list WEB --json 2>/dev/null | grep -q '"appId"'; then
  ${FIREBASE} apps:create WEB "julie-menu"
fi

WEB_APP_ID="$(${FIREBASE} apps:list WEB --json | node -e "
const fs = require('fs');
const raw = fs.readFileSync(0, 'utf8');
const parsed = JSON.parse(raw);
const list = Array.isArray(parsed) ? parsed : (parsed.result || []);
if (!list.length) process.exit(1);
process.stdout.write(list[0].appId);
")"

${FIREBASE} apps:sdkconfig WEB "${WEB_APP_ID}" --json | node -e "
const fs = require('fs');
const raw = fs.readFileSync(0, 'utf8');
const parsed = JSON.parse(raw);
const sdk = parsed.result ? parsed.result.sdkConfig : parsed.sdkConfig;
if (!sdk) {
  console.error('Could not read web SDK config');
  process.exit(1);
}
const body = 'export const firebaseConfig = ' + JSON.stringify(sdk, null, 2) + ';\\n';
fs.writeFileSync('firebase-config.js', body);
console.log('Wrote firebase-config.js (keep this file local; it is gitignored)');
"

${FIREBASE} firestore:databases:create "(default)" --location=asia-east1 --edition=standard || true

${FIREBASE} deploy --only firestore:rules,firestore:indexes,hosting

echo
echo "Done."
echo "Next: in Firebase Console -> Firestore, create document menu/current using firestore-seed.example.json"
echo "Hosting URL: https://${PROJECT_ID}.web.app"
