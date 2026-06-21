document.addEventListener('DOMContentLoaded', function () {

  // =====================================================
  // CONNECTION MANAGER -- receives tab ID from background
  // =====================================================
  let anchoredTabId = null;
  let anchoredTabUrl = null;

  chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    if (request.action === 'initSidePanel') {
      anchoredTabId = request.tabId;
      anchoredTabUrl = request.url;
      updateStatus('Ready. Click Select Page Element to begin.');
      chrome.runtime.sendMessage({ action: 'getTabInfo' }, (response) => {
        if (response && response.success) {
          anchoredTabId = response.tab.id;
          anchoredTabUrl = response.tab.url;
        }
      });
      return false;
    }
  });

  async function ensureTabAnchor() {
    if (anchoredTabId) return anchoredTabId;
    try {
      const tabs = await chrome.tabs.query({ active: true, currentWindow: true });
      if (tabs && tabs.length > 0 && tabs[0].id) {
        anchoredTabId = tabs[0].id;
        anchoredTabUrl = tabs[0].url;
        return anchoredTabId;
      }
    } catch (e) { /* fall through */ }
    return new Promise((resolve) => {
      chrome.runtime.sendMessage({ action: 'getTabInfo' }, (response) => {
        if (response && response.success) {
          anchoredTabId = response.tab.id;
          anchoredTabUrl = response.tab.url;
          resolve(anchoredTabId);
        } else {
          resolve(null);
        }
      });
    });
  }

  // =====================================================
  // THEME MANAGER — 10-theme cycling system
  // =====================================================
  class ThemeManager {
    constructor() {
      this.storageKey = 'playwrightHelperTheme';
      this.themeSwitcher = document.getElementById('themeSwitcher');
      this.themeIcon = document.getElementById('themeIcon');
      this.particleField = document.getElementById('particleField');

      // All 10 themes in order — dark themes first, then light
      this.themes = [
        { id: 'cyber-dark',         icon: '☣️',  emoji: '☣️',  name: 'Cyber Dark' },
        { id: 'neon-blue',          icon: '⚡',  emoji: '⚡',  name: 'Neon Blue' },
        { id: 'deep-space',         icon: '🌌',  emoji: '🌌',  name: 'Deep Space' },
        { id: 'glassmorphism',      icon: '💎',  emoji: '💎',  name: 'Glassmorphism' },
        { id: 'ai-dashboard',       icon: '🤖',  emoji: '🤖',  name: 'AI Dashboard' },
        { id: 'developer-console',  icon: '💻',  emoji: '💻',  name: 'Dev Console' },
        { id: 'frosted-white',      icon: '❄️',  emoji: '❄️',  name: 'Frosted White' },
        { id: 'ai-workspace',       icon: '🧠',  emoji: '🧠',  name: 'AI Workspace' },
        { id: 'soft-light-tech',    icon: '☁️',  emoji: '☁️',  name: 'Soft Light Tech' },
        { id: 'apple-linear',       icon: '🪨',  emoji: '🪨',  name: 'Apple+Linear' }
      ];

      this.currentThemeId = 'cyber-dark';
      this.currentIndex = 0;
    }

    async initialize() {
      const savedThemeId = await this.loadTheme();
      // Find saved theme index, default to 0 (cyber-dark)
      const foundIndex = this.themes.findIndex(t => t.id === savedThemeId);
      this.currentIndex = foundIndex >= 0 ? foundIndex : 0;
      this.currentThemeId = this.themes[this.currentIndex].id;

      this.applyTheme(this.currentThemeId);
      this.generateParticles();
      this.bindEvents();
    }

    async loadTheme() {
      try {
        const result = await chrome.storage.local.get(this.storageKey);
        return result[this.storageKey];
      } catch (error) {
        console.error('[THEME] Failed to load theme:', error);
        return null;
      }
    }

    async saveTheme(themeId) {
      try {
        await chrome.storage.local.set({ [this.storageKey]: themeId });
      } catch (error) {
        console.error('[THEME] Failed to save theme:', error);
      }
    }

    applyTheme(themeId) {
      document.documentElement.setAttribute('data-theme', themeId);
      this.currentThemeId = themeId;
      this.currentIndex = this.themes.findIndex(t => t.id === themeId);
      this.updateIcon();
      this.updateParticles();
    }

    updateIcon() {
      if (this.themeIcon) {
        const theme = this.themes[this.currentIndex];
        this.themeIcon.textContent = theme.icon;
      }
    }

    cycleForward() {
      this.currentIndex = (this.currentIndex + 1) % this.themes.length;
      const theme = this.themes[this.currentIndex];
      this.applyTheme(theme.id);
      this.saveTheme(theme.id);
      this.showThemeToast(theme);
    }

    cycleBackward() {
      this.currentIndex = (this.currentIndex - 1 + this.themes.length) % this.themes.length;
      const theme = this.themes[this.currentIndex];
      this.applyTheme(theme.id);
      this.saveTheme(theme.id);
      this.showThemeToast(theme);
    }

    showThemeToast(theme) {
      // Brief floating indicator showing theme name
      const existing = document.querySelector('.theme-toast');
      if (existing) existing.remove();

      const toast = document.createElement('div');
      toast.className = 'theme-toast';
      toast.textContent = `${theme.emoji}  ${theme.name}`;
      Object.assign(toast.style, {
        position: 'fixed',
        bottom: '70px',
        right: '18px',
        background: 'var(--bg-elevated)',
        color: 'var(--text-primary)',
        padding: '6px 14px',
        borderRadius: '20px',
        fontSize: '0.75rem',
        fontWeight: '500',
        zIndex: '101',
        pointerEvents: 'none',
        border: '1px solid var(--border-medium)',
        boxShadow: 'var(--shadow-lg)',
        backdropFilter: 'blur(12px)',
        animation: 'toastSlideIn 0.3s cubic-bezier(0.16, 1, 0.3, 1)',
        fontFamily: 'var(--font-sans)',
        letterSpacing: '0.01em'
      });
      document.body.appendChild(toast);

      setTimeout(() => {
        toast.style.opacity = '0';
        toast.style.transition = 'opacity 0.3s ease-out';
        setTimeout(() => toast.remove(), 300);
      }, 1400);
    }

    // —— Particle field for dark themes ——
    generateParticles() {
      if (!this.particleField) return;
      this.particleField.innerHTML = '';
      const count = 35;
      const frag = document.createDocumentFragment();
      for (let i = 0; i < count; i++) {
        const p = document.createElement('div');
        p.className = 'p';
        p.style.left = Math.random() * 100 + '%';
        p.style.animationDuration = (8 + Math.random() * 20) + 's';
        p.style.animationDelay = Math.random() * 15 + 's';
        p.style.width = (1 + Math.random() * 2) + 'px';
        p.style.height = p.style.width;
        p.style.opacity = (0.3 + Math.random() * 0.7);
        frag.appendChild(p);
      }
      this.particleField.appendChild(frag);
    }

    updateParticles() {
      if (!this.particleField) return;
      const isDark = this.currentIndex < 6; // first 6 are dark themes
      this.particleField.style.display = isDark ? 'block' : 'none';
    }

    bindEvents() {
      if (this.themeSwitcher) {
        this.themeSwitcher.addEventListener('click', (e) => {
          if (e.shiftKey) {
            this.cycleBackward();
          } else {
            this.cycleForward();
          }
        });
      }

      // Keyboard shortcut: Ctrl+Shift+T to cycle theme
      document.addEventListener('keydown', (e) => {
        if (e.ctrlKey && e.shiftKey && e.key === 'T') {
          e.preventDefault();
          this.cycleForward();
        }
      });
    }
  }

  // Initialize Theme Manager
  const themeManager = new ThemeManager();
  themeManager.initialize();


  // 立即隐藏 loading overlay
  const loadingOverlay = document.getElementById('loadingOverlay');
  if (loadingOverlay) {
    loadingOverlay.hidden = true;
  }

  const selectBtn = document.getElementById('selectBtn');
  const statusText = document.getElementById('statusText');
  const locatorOutput = document.getElementById('locatorOutput');
  const locatorInput = document.getElementById('locatorInput');
  const validateBtn = document.getElementById('validateBtn');
  const copyBtn = document.getElementById('copyBtn');
  const clearInputBtn = document.getElementById('clearInputBtn');
  const locatorCount = document.getElementById('locatorCount');
  const addLocatorBtn = document.getElementById('addLocatorBtn');

  // Auto Login Elements

  // PageObject Management Elements
  const viewPageObjectBtn = document.getElementById('viewPageObjectBtn');
  const saveElementBtn = document.getElementById('saveElementBtn');
  const saveContainerBtn = document.getElementById('saveContainerBtn');


  let isWaitingForElement = false;
  let currentElementData = null;
  let currentLocators = [];

  // 暴露到全局作用域供 pageObjectUI.js 访问
  window.currentLocators = currentLocators;

  const MESSAGES = {
    SELECT_ELEMENT: "Please click on the target element on the page...",
    CANCEL_SELECTION: "Selection cancelled.",
    ELEMENT_SELECTED: "Element selected, generating locators...",
    LOCATORS_GENERATED: "Locators generated successfully!",
    GENERATION_ERROR: "Error occurred while generating locators.",
    VALIDATION_SUCCESS: "Locator validation successful! Element highlighted on page.",
    VALIDATION_ERROR: "Validation failed",
    CONNECTION_ERROR: "Unable to connect to content script.",
    RESTRICTED_PAGE: "Cannot use extension on this page.",
    INITIALIZING: "Initializing extension...",
    VALIDATING: "Validating locator...",
    ENTER_LOCATOR: "Please enter a locator expression to validate",
    COPIED_TO_CLIPBOARD: "Locators copied to clipboard!"
  };

  selectBtn.addEventListener('click', async () => {
    if (isWaitingForElement) {
      const response = await sendMessageToContentScript("stopSelecting");
      updateUI(false, MESSAGES.CANCEL_SELECTION);
      return;
    }

    const response = await sendMessageToContentScript("startSelecting");
    if (response && response.status === "selection_started") {
      updateUI(true, MESSAGES.SELECT_ELEMENT);
    } else if (response === 'restricted') {
      handleConnectionError('restricted');
    } else {
      handleConnectionError(response);
    }
  });
  });

  chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    if (request.action === "elementSelected") {
      const elementInfo = request.data;
      currentElementData = elementInfo;
      updateUI(false, MESSAGES.ELEMENT_SELECTED);
      sendToPython(elementInfo);
    }
  });

  validateBtn.addEventListener('click', async () => {
    const locatorExpression = locatorInput.value.trim();
    if (!locatorExpression) {
      updateStatus(MESSAGES.ENTER_LOCATOR);
      return;
    }

    try {
      updateStatus(MESSAGES.VALIDATING);
      const response = await sendMessageToContentScript({
        action: "validateLocator",
        locator: locatorExpression
      });

      if (response && response.success) {
        updateStatus(MESSAGES.VALIDATION_SUCCESS);
        showToast('success', 'Element found and highlighted!');
      } else if (response && response.error) {
        updateStatus(MESSAGES.VALIDATION_ERROR + ': ' + response.error);
        showToast('error', response.error);
      } else {
        handleConnectionError(response);
      }
    } catch (error) {
      console.error('Error validating locator:', error);
      updateStatus('Validation error: ' + error.message);
      showToast('error', 'Validation error: ' + error.message);
    }
  }););

  copyBtn.addEventListener('click', async () => {
    if (!locatorOutput.value) {
      showToast('error', 'No locators to copy');
      return;
    }

    try {
      await navigator.clipboard.writeText(locatorOutput.value);
      showToast('success', MESSAGES.COPIED_TO_CLIPBOARD);
    } catch (error) {
      console.error('Failed to copy:', error);
      showToast('error', 'Failed to copy');
    }
  });

  clearInputBtn.addEventListener('click', () => {
    locatorInput.value = '';
    locatorInput.focus();
  });

  function updateUI(isSelecting, message) {
    isWaitingForElement = isSelecting;
    selectBtn.textContent = isSelecting ? "Cancel Selection" : "Select Page Element";
    selectBtn.classList.toggle('btn-secondary', isSelecting);
    selectBtn.classList.toggle('btn-primary', !isSelecting);
    selectBtn.disabled = false;
    updateStatus(message);
  }

  function updateStatus(message) {
    statusText.textContent = message;
  }

    function handleConnectionError(response) {
    if (response === null) {
      updateUI(false, MESSAGES.CONNECTION_ERROR);
      showToast('error', 'Connection failed. Please refresh the page and try again.');
    } else if (response === 'restricted') {
      updateUI(false, 'Cannot use on this page type.');
      showToast('error', 'Please open a normal webpage to use this extension.');
    } else if (response === 'timeout') {
      updateUI(false, 'Page still loading. Wait a moment and try again.');
      showToast('error', 'Page not ready yet. Wait and retry.');
    } else {
      updateUI(false, "Failed to start selection mode.");
      showToast('error', 'Selection mode failed');
    }
  }

  async function sendMessageToContentScript(action) {
    return new Promise(async (resolve) => {
      try {
        const tabId = await ensureTabAnchor();
        if (!tabId) {
          resolve('restricted');
          return;
        }

        if (anchoredTabUrl && isRestrictedPage(anchoredTabUrl)) {
          resolve('restricted');
          return;
        }

        const injected = await ensureContentScriptInjected(tabId);
        if (!injected) {
          resolve(null);
          return;
        }

        chrome.tabs.sendMessage(tabId, action, {frameId: 0}, (response) => {
          if (chrome.runtime.lastError) {
            resolve(null);
          } else {
            resolve(response);
          }
        });
      } catch (error) {
        resolve(null);
      }
    });
  }

  async function ensureContentScriptInjected(tabId) {
    try {
      const response = await chrome.tabs.sendMessage(tabId, { action: 'ping' }, {frameId: 0});
      if (response && response.status) return true;
    } catch (e) { /* not loaded */ }

    try {
      await chrome.scripting.executeScript({
        target: { tabId: tabId },
        files: ['content/content.js']
      });
    } catch (e) {
      console.error('Content script injection failed:', e);
      return false;
    }

    const deadline = Date.now() + 3000;
    while (Date.now() < deadline) {
      try {
        const resp = await chrome.tabs.sendMessage(tabId, { action: 'ping' }, {frameId: 0});
        if (resp && resp.status) return true;
      } catch (e) { /* still init */ }
      await new Promise(r => setTimeout(r, 200));
    }
    return false;
  }

  function isRestrictedPage(url) {
    if (!url) return true;
    const restricted = ['chrome://', 'chrome-extension://', 'moz-extension://', 'about:', 'edge://'];
    return restricted.some(prefix => url.startsWith(prefix));
  }

  function sendToPython(elementData) {
    if (!elementData || typeof elementData !== 'object') {
      updateStatus("Invalid element data");
      showToast('error', 'Invalid element data');
      return;
    }

    currentElementData = elementData;
    currentLocators = [];
    if (saveElementBtn) saveElementBtn.disabled = true;

    chrome.runtime.sendMessage({
      action: "generateLocators",
      elementInfo: elementData,
      tabId: anchoredTabId
    }, (response) => {
      if (chrome.runtime.lastError) {
        updateStatus("Error: " + chrome.runtime.lastError.message);
        showToast('error', 'Error generating locators');
      } else if (response.success) {
        handlePythonResponse({ locators: response.locators });
      } else {
        handlePythonResponse({ error: response.error });
      }
    });
  }

  function handlePythonResponse(response) {
    if (response.locators && Array.isArray(response.locators)) {
      renderLocatorList(response.locators);
      locatorCount.textContent = response.locators.length;
      updateStatus(MESSAGES.LOCATORS_GENERATED);
      showToast('success', `Generated ${response.locators.length} locators`);

      if (response.locators.length > 0 && response.locators[0].trim()) {
        locatorInput.value = response.locators[0].trim();
      }

      currentLocators = response.locators;
      window.currentLocators = currentLocators; // 同步到全局
      if (saveElementBtn) saveElementBtn.disabled = false;
      if (saveContainerBtn) saveContainerBtn.disabled = false;
    } else if (response.locator) {
      renderLocatorList([response.locator]);
      locatorCount.textContent = '1';
      updateStatus(MESSAGES.LOCATORS_GENERATED);
      showToast('success', 'Locator generated');
      currentLocators = [response.locator];
      window.currentLocators = currentLocators; // 同步到全局
      if (saveElementBtn) saveElementBtn.disabled = false;
      if (saveContainerBtn) saveContainerBtn.disabled = false;
    } else if (response.error) {
      renderLocatorList([]);
      locatorCount.textContent = '0';
      updateStatus(MESSAGES.GENERATION_ERROR);
      showToast('error', response.error);
      if (saveElementBtn) saveElementBtn.disabled = true;
      if (saveContainerBtn) saveContainerBtn.disabled = true;
    } else {
      updateStatus("Unknown response format");
      showToast('error', 'Unknown response format');
      if (saveElementBtn) saveElementBtn.disabled = true;
      if (saveContainerBtn) saveContainerBtn.disabled = true;
    }
  }

  // ========== Locator List Management ==========

  let isAddingManualLocator = false;

  /**
   * 渲染定位器列表
   */
  function renderLocatorList(locators) {
    if (!locatorOutput) return;

    if (locators.length === 0) {
      locatorOutput.innerHTML = '<div class="locator-list-empty">Generated locators will appear here...</div>';
      return;
    }

    locatorOutput.innerHTML = locators.map((locator, index) => `
      <div class="locator-list-item" data-locator-index="${index}">
        <div class="locator-list-item-content">${escapeHtml(locator)}</div>
        <div class="locator-list-item-actions">
          <button class="locator-delete-btn" data-locator-index="${index}" title="Delete this locator" aria-label="Delete locator ${index + 1}">
            <span aria-hidden="true">✕</span>
          </button>
        </div>
      </div>
    `).join('');

    // 绑定删除按钮事件
    locatorOutput.querySelectorAll('.locator-delete-btn').forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        const index = parseInt(btn.getAttribute('data-locator-index'), 10);
        deleteLocator(index);
      });
    });
  }

  /**
   * 删除单个定位器
   */
  function deleteLocator(index) {
    if (index < 0 || index >= currentLocators.length) return;

    const deletedLocator = currentLocators[index];
    currentLocators.splice(index, 1);

    // 同步到全局引用
    window.currentLocators = currentLocators;

    // 重新渲染列表
    renderLocatorList(currentLocators);
    locatorCount.textContent = currentLocators.length;

    // 如果删除的是当前选中的定位器，清空输入框
    if (locatorInput.value.trim() === deletedLocator) {
      locatorInput.value = '';
    }

    // 更新保存按钮状态
    if (saveElementBtn) {
      saveElementBtn.disabled = currentLocators.length === 0;
    }

    // 同步更新 modal 中的预览（如果 modal 打开）
    if (window.pageObjectUIManager && window.pageObjectUIManager.currentLocators) {
      window.pageObjectUIManager.currentLocators = [...currentLocators];
      window.pageObjectUIManager.updateLocatorPreview(window.pageObjectUIManager.currentLocators);
    }

    showToast('success', 'Locator deleted');
  }

  /**
   * 添加手动定位器输入框
   */
  function addManualLocatorInput() {
    if (isAddingManualLocator) return;
    isAddingManualLocator = true;

    const inputRow = document.createElement('div');
    inputRow.className = 'locator-list-item-input';
    inputRow.innerHTML = `
      <input
        type="text"
        class="locator-input-field"
        placeholder="Enter locator (e.g., page.locator('#id'))"
        autofocus
      />
      <button class="locator-save-btn" title="Save locator">
        <span aria-hidden="true">✓</span> Save
      </button>
      <button class="locator-cancel-btn" title="Cancel">
        <span aria-hidden="true">✕</span>
      </button>
    `;

    // 如果是空列表，清空提示文字
    const emptyState = locatorOutput.querySelector('.locator-list-empty');
    if (emptyState) {
      locatorOutput.innerHTML = '';
    }

    locatorOutput.appendChild(inputRow);

    const inputField = inputRow.querySelector('.locator-input-field');
    const saveBtn = inputRow.querySelector('.locator-save-btn');
    const cancelBtn = inputRow.querySelector('.locator-cancel-btn');

    // 取消按钮
    cancelBtn.addEventListener('click', () => {
      inputRow.remove();
      isAddingManualLocator = false;
      if (currentLocators.length === 0) {
        locatorOutput.innerHTML = '<div class="locator-list-empty">Generated locators will appear here...</div>';
      }
    });

    // 保存按钮
    saveBtn.addEventListener('click', () => {
      const locatorValue = inputField.value.trim();
      if (locatorValue) {
        currentLocators.push(locatorValue);
        window.currentLocators = currentLocators;
        renderLocatorList(currentLocators);
        locatorCount.textContent = currentLocators.length;

        // 更新按钮状态
        if (saveElementBtn) saveElementBtn.disabled = false;
        if (saveContainerBtn) saveContainerBtn.disabled = false;

        showToast('success', 'Locator added');
      }
      isAddingManualLocator = false;
    });

    // Enter 键保存
    inputField.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') {
        e.preventDefault();
        saveBtn.click();
      } else if (e.key === 'Escape') {
        cancelBtn.click();
      }
    });

    // 聚焦输入框
    inputField.focus();
  }

  /**
   * HTML 转义辅助函数
   */
  function escapeHtml(str) {
    if (!str) return '';
    return String(str)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');
  }

  function showToast(type, message) {
    const toastContainer = document.getElementById('toastContainer');
    if (!toastContainer) {
      return;
    }

    const toast = document.createElement('div');
    toast.className = `toast toast-${type}`;
    toast.textContent = message;
    toastContainer.appendChild(toast);

    setTimeout(() => {
      if (toast.parentNode) {
        toast.parentNode.removeChild(toast);
      }
    }, 3000);
  }

  // PageObject 管理功能初始化
  async function initPageObjectManagement() {

    try {
      // 初始化 PageObjectManager
      if (window.pageObjectManager) {
        await window.pageObjectManager.initialize();
      }

      // 初始化 PageObjectUIManager
      if (window.pageObjectUIManager) {
        await window.pageObjectUIManager.initialize(window.pageObjectManager);
      }

      // 查看 PageObject 按钮事件
      if (viewPageObjectBtn) {
        viewPageObjectBtn.addEventListener('click', () => {
          if (window.pageObjectUIManager) {
            window.pageObjectUIManager.showViewerModal();
          }
        });
      }

      // 保存元素按钮事件
      if (saveElementBtn) {
        saveElementBtn.addEventListener('click', async () => {

          if (!window.pageObjectUIManager) {
            showToast('error', 'PageObject UI not initialized');
            return;
          }
          if (!currentElementData) {
            showToast('error', 'No element selected');
            return;
          }
          if (currentLocators.length === 0) {
            showToast('error', 'No locators generated');
            return;
          }

          try {
            await window.pageObjectUIManager.showSaveElementModal(currentElementData, currentLocators);
          } catch (error) {
            console.error('[SAVE-ELEM] Error:', error);
            showToast('error', 'Failed to open dialog: ' + error.message);
          }
        });
      }

      // 保存 Container 按钮事件
      if (saveContainerBtn) {
        saveContainerBtn.addEventListener('click', async () => {

          if (!window.pageObjectUIManager) {
            showToast('error', 'PageObject UI not initialized');
            return;
          }
          if (!currentElementData) {
            showToast('error', 'No element selected');
            return;
          }
          if (currentLocators.length === 0) {
            showToast('error', 'No locators generated');
            return;
          }

          try {
            await window.pageObjectUIManager.showSaveContainerModal(currentElementData, currentLocators);
          } catch (error) {
            console.error('[SAVE-CONTAINER] Error:', error);
            showToast('error', 'Failed to open dialog: ' + error.message);
          }
        });
      }

      // 添加手动定位器按钮事件
      if (addLocatorBtn) {
        addLocatorBtn.addEventListener('click', () => {
          addManualLocatorInput();
        });
      }

    } catch (error) {
      console.error('[PO-INIT] Error:', error);
    }
  }

  // 初始化 PageObject 管理功能
  initPageObjectManagement();

  // 暴露函数到全局作用域供 pageObjectUI.js 使用
  window.renderLocatorList = renderLocatorList;
  window.deleteLocator = deleteLocator;
  window.addManualLocatorInput = addManualLocatorInput;

});






