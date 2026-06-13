/**
 * Options page script — loads settings and auto-saves on change.
 * Reads/writes to chrome.storage.sync key "playwrightLocatorSettings".
 */

const SETTINGS_KEY = 'playwrightLocatorSettings';

const defaults = {
  locatorPreferences: {
    preferGetByRole: true,
    preferGetByLabel: true,
    preferGetByText: true,
    preferGetByTitle: false,
    preferCssSelectors: false,
    preferDataAttributes: true
  },
  ui: {
    theme: 'auto',
    language: 'auto'
  },
  advanced: {
    maxTextLength: 100,
    includeDataAttributes: true,
    useExactMatch: false,
    enableXPathSupport: false,
    generatePageObjectCode: false,
    validationTimeout: 5
  }
};

/** Map element IDs to settings paths: [section, key] */
const bindings = {
  preferGetByRole:       ['locatorPreferences', 'preferGetByRole'],
  preferGetByLabel:      ['locatorPreferences', 'preferGetByLabel'],
  preferGetByText:       ['locatorPreferences', 'preferGetByText'],
  preferGetByTitle:      ['locatorPreferences', 'preferGetByTitle'],
  preferDataAttributes:  ['locatorPreferences', 'preferDataAttributes'],
  preferCssSelectors:    ['locatorPreferences', 'preferCssSelectors'],
  maxTextLength:         ['advanced', 'maxTextLength'],
  useExactMatch:         ['advanced', 'useExactMatch'],
  enableXPathSupport:    ['advanced', 'enableXPathSupport'],
  generatePageObjectCode:['advanced', 'generatePageObjectCode'],
  validationTimeout:     ['advanced', 'validationTimeout']
};

const toastEl = document.getElementById('toast');
let toastTimer = null;

function showToast(message) {
  if (toastTimer) clearTimeout(toastTimer);
  toastEl.textContent = message || 'Settings saved';
  toastEl.classList.add('visible');
  toastTimer = setTimeout(() => toastEl.classList.remove('visible'), 1800);
}

/** Load settings from storage and populate the form */
async function loadSettings() {
  try {
    const result = await chrome.storage.sync.get(SETTINGS_KEY);
    const settings = result[SETTINGS_KEY] || defaults;

    for (const [id, [section, key]] of Object.entries(bindings)) {
      const el = document.getElementById(id);
      if (!el) continue;
      const value = (settings[section] && settings[section][key] !== undefined)
        ? settings[section][key]
        : defaults[section] && defaults[section][key];

      if (el.type === 'checkbox') {
        el.checked = Boolean(value);
      } else if (el.type === 'number') {
        el.value = Number(value);
      }
    }
  } catch (err) {
    console.error('Failed to load settings:', err);
  }
}

/** Persist the full settings object to storage */
async function saveSettings() {
  try {
    const result = await chrome.storage.sync.get(SETTINGS_KEY);
    const settings = result[SETTINGS_KEY] || JSON.parse(JSON.stringify(defaults));

    for (const [id, [section, key]] of Object.entries(bindings)) {
      const el = document.getElementById(id);
      if (!el) continue;
      const value = el.type === 'checkbox' ? el.checked : Number(el.value);
      settings[section][key] = value;
    }

    await chrome.storage.sync.set({ [SETTINGS_KEY]: settings });
    showToast();

    // Notify background script so cached settings refresh immediately
    try {
      chrome.runtime.sendMessage({ action: 'settingsChanged', settings });
    } catch (_) { /* background may not be ready */ }
  } catch (err) {
    console.error('Failed to save settings:', err);
    showToast('Save failed — try again');
  }
}

/** Attach change listeners */
function bindEvents() {
  for (const id of Object.keys(bindings)) {
    const el = document.getElementById(id);
    if (!el) continue;
    el.addEventListener('change', saveSettings);
  }
}

document.addEventListener('DOMContentLoaded', () => {
  loadSettings().then(bindEvents);
});
