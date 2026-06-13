# Playwright Locator Helper

A Chrome extension that generates robust, multi-strategy Playwright locators for web elements — just click and inspect.

![Version](https://img.shields.io/badge/version-2.0.0-blue)
![Chrome](https://img.shields.io/badge/chrome-%3E%3D116-green)
![Manifest](https://img.shields.io/badge/manifest-v3-orange)

## Features

- **One-click element inspection** — click the extension icon, then click any element on the page to generate locators instantly.
- **Multi-strategy locator generation** — produces `getByRole`, `getByLabel`, `getByText`, `getByTitle`, CSS selectors, and data-attribute selectors ranked by robustness.
- **Locator validation** — paste any Playwright locator expression and test it live on the page with element highlighting.
- **PageObject management** — save elements to named PageObjects, export/import as JSON for reuse across projects.
- **10 built-in themes** — dynamic theme switching with a deep-sea particle field effect.
- **Keyboard shortcuts** — `Ctrl+Shift+E` to start element selection, `Ctrl+Shift+P` to open the side panel.
- **Configurable preferences** — choose which locator strategies to prioritize in settings.

## Installation

### Load unpacked (development)

1. Clone or download this repository.
2. Open Chrome and navigate to `chrome://extensions`.
3. Enable **Developer mode** (toggle in the top-right corner).
4. Click **Load unpacked** and select the project folder.
5. The extension icon appears in the toolbar — pin it for quick access.

### Requirements

- Chrome 116 or later (Manifest V3 with Side Panel API).

## Usage

### Generate locators for an element

1. Navigate to the target webpage.
2. Click the extension icon in the toolbar (or press `Ctrl+Shift+P`) to open the side panel.
3. Click **Select Page Element**, then click the target element on the page.
4. The side panel displays a ranked list of generated locator expressions.
5. Click any locator to copy it, or use **Copy all** to copy the entire list.

### Validate a locator expression

1. Open the side panel on the target page.
2. Paste a Playwright locator expression into the **Test Locator Expression** field (e.g., `page.get_by_role('button', name='Submit')`).
3. Click **Validate Locator** — matching elements are highlighted on the page, and a count is shown.

### Manage PageObjects

1. Click **View PageObjects** in the side panel.
2. Create a new PageObject (e.g., `LoginPage`).
3. After generating locators for an element, click **Save Element** to add it to the selected PageObject.
4. Use **Export** to download the PageObject as a JSON file, or **Import** to load one.

## Locator Priority

Locators are ranked from most robust to least:

1. `getByRole` — uses ARIA role + accessible name (highest reliability)
2. `getByLabel` — matches form elements by their label text
3. `getByText` — matches elements by visible text content
4. `getByTitle` — matches elements by the `title` attribute
5. `data-testid` / data attributes — uses explicit test markers
6. CSS selectors — fallback when semantic options are unavailable

You can adjust which strategies are generated in the extension's Options page.

## Keyboard Shortcuts

| Shortcut | macOS | Action |
|----------|-------|--------|
| `Ctrl+Shift+E` | `Cmd+Shift+E` | Start element selection mode |
| `Ctrl+Shift+P` | `Cmd+Shift+P` | Open side panel |

## Project Structure

```
playwright-helper/
├── manifest.json              # Chrome extension manifest (MV3)
├── background.js              # Service worker: lifecycle, messaging, injection
├── content/
│   ├── content.js             # Injected script: element selection, locator generation, validation
│   └── content.css            # Injected styles: highlight overlay, selection UI
├── sidepanel/
│   ├── sidepanel.html         # Side panel UI
│   ├── sidepanel.js           # Side panel logic: renders results, handles actions
│   ├── sidepanel.css          # Side panel styles (10 themes)
│   ├── pageObjectManager.js   # PageObject CRUD and storage (chrome.storage.local)
│   └── pageObjectUI.js        # PageObject modal dialogs and viewer
├── options/
│   ├── options.html           # Extension settings page
│   └── options.js             # Settings persistence
└── images/                    # Extension icons (16/32/48/128 px)
```

## Settings

Accessible via **right-click extension icon → Options**, or `chrome://extensions` → **Details → Extension options**:

| Setting | Default | Description |
|---------|---------|-------------|
| `preferGetByRole` | On | Generate `getByRole` locators |
| `preferGetByLabel` | On | Generate `getByLabel` locators |
| `preferGetByText` | On | Generate `getByText` locators |
| `preferGetByTitle` | Off | Generate `getByTitle` locators |
| `preferCssSelectors` | Off | Generate CSS selector fallbacks |
| `preferDataAttributes` | On | Use `data-testid` / `data-test` attributes |
| Theme | Auto | UI theme (Auto / Light / Dark + 7 custom themes) |
| Max Text Length | 100 | Truncation threshold for text-based locators |

## Author

Alien Hu

## License

MIT

## Privacy

This extension does **not** collect, transmit, or store any personal or browsing data.

- **User preferences** (locator strategies, theme) are stored locally via chrome.storage.sync for cross-device synchronization and are never shared with any third party.
- **PageObject data** is stored locally via chrome.storage.local and remains entirely on your device.
- **Host permissions** (<all_urls>) are required solely to inspect DOM elements on the active page for Playwright locator generation — all processing happens in-browser. No page content is recorded or transmitted.
