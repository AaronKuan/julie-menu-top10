import { initializeApp } from 'https://www.gstatic.com/firebasejs/10.14.1/firebase-app.js';
import { doc, getDoc, getFirestore } from 'https://www.gstatic.com/firebasejs/10.14.1/firebase-firestore.js';

const TEXT_BINDINGS = [
  { path: ['slideA', 'newProduct'], selector: '.newProduct' },
  { path: ['slideA', 'slogan'], selector: '.slogan' },
  { path: ['slideA', 'productName'], selector: '.productName' },
  { path: ['slideA', 'productNameEng'], selector: '.productNameEng' },
  { path: ['slideA', 'specialPrice'], selector: '.specialPrice' },
  { path: ['slideB', 'member'], selector: '.member' },
  { path: ['slideB', 'saleTitle'], selector: '.saleTitle', multiline: true },
  { path: ['slideC', 'menthawashed'], selector: '.menthawashed', multiline: true },
  { path: ['slideC', 'menthawashedEng'], selector: '.menthawashedEng', multiline: true },
  { path: ['slideC', 'citricnatural'], selector: '.citricnatural', multiline: true },
  { path: ['slideC', 'citricnaturalEng'], selector: '.citricnaturalEng', multiline: true }
];

function readNestedValue(source, path) {
  let current = source;
  for (const key of path) {
    if (current === null || current === undefined || typeof current !== 'object') {
      return null;
    }
    current = current[key];
  }
  return typeof current === 'string' ? current : null;
}

function applyText(selector, value, multiline) {
  const element = document.querySelector(selector);
  if (!element || !value) {
    return;
  }
  if (multiline) {
    element.innerHTML = value
      .split('\n')
      .map((line) => line.replace(/</g, '&lt;').replace(/>/g, '&gt;'))
      .join('<br/>');
    return;
  }
  element.textContent = value;
}

function applyPrice(selector, value) {
  const element = document.querySelector(selector);
  if (!element || !value) {
    return;
  }
  const span = element.querySelector('span');
  if (span) {
    span.textContent = value;
    return;
  }
  element.textContent = `$ ${value}`;
}

async function loadFirebaseConfig() {
  try {
    const module = await import('./firebase-config.js');
    if (!module.firebaseConfig || typeof module.firebaseConfig.projectId !== 'string') {
      return null;
    }
    if (module.firebaseConfig.projectId === 'YOUR_FIREBASE_PROJECT_ID') {
      return null;
    }
    return module.firebaseConfig;
  } catch (error) {
    console.info('Firebase config not found; using built-in menu copy.', error);
    return null;
  }
}

export async function loadMenuFromFirestore() {
  const firebaseConfig = await loadFirebaseConfig();
  if (!firebaseConfig) {
    return;
  }

  try {
    const app = initializeApp(firebaseConfig);
    const db = getFirestore(app);
    const snapshot = await getDoc(doc(db, 'menu', 'current'));
    if (!snapshot.exists()) {
      return;
    }

    const data = snapshot.data();
    TEXT_BINDINGS.forEach((binding) => {
      const value = readNestedValue(data, binding.path);
      applyText(binding.selector, value, Boolean(binding.multiline));
    });

    applyPrice('.price', readNestedValue(data, ['slideA', 'price']));
    applyPrice('.mprice', readNestedValue(data, ['slideC', 'mprice']));
    applyPrice('.cprice', readNestedValue(data, ['slideC', 'cprice']));

    const onePlusone = readNestedValue(data, ['slideB', 'onePlusone']);
    if (onePlusone) {
      const element = document.querySelector('.onePlusone');
      if (element) {
        element.textContent = onePlusone;
      }
    }
  } catch (error) {
    console.error('Unable to load menu from Firestore; keeping local copy.', error);
  }
}

loadMenuFromFirestore();
