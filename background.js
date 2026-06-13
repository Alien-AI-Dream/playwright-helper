/**
 * Background Script (Service Worker) for Playwright Locator Helper
 * Handles extension lifecycle, tab management, and inter-component communication
 */

 const EXTENSION_NAME = 'Playwright Locator Helper';
 const EXTENSION_VERSION = '2.0.0';
 
 // URLs where the extension cannot be used
 const RESTRICTED_URLS = [
     'chrome://', 'chrome-extension://', 'moz-extension://',
     'edge://', 'opera://', 'about:', 'devtools://'
 ];
 
 // Settings cache
 let cachedSettings = null;
 
 /**
  * Extension installation/update handler
  */
 chrome.runtime.onInstalled.addListener((details) => {
     
     switch (details.reason) {
         case 'install':
             handleInstallation();
             break;
         case 'update':
             handleUpdate(details.previousVersion);
             break;
         case 'chrome_update':
         case 'shared_module_update':
             break;
     }
 });
 
 /**
  * Handle first-time installation
  */
 async function handleInstallation() {
     
     try {
         // Set default settings
         await setDefaultSettings();
         
         // Show welcome notification
         await showNotification(
             'Welcome to Playwright Locator Helper!',
             'Click the extension icon to start generating robust locators for your web elements.'
         );
                  
     } catch (error) {
         console.error('Error during installation setup:', error);
     }
 }
 
 /**
  * Handle extension updates
  */
 async function handleUpdate(previousVersion) {
     
     try {
         // Migrate settings if necessary
         await migrateSettings(previousVersion);
         
         // Show update notification
         await showNotification(
             `${EXTENSION_NAME} Updated`,
             `Updated to version ${EXTENSION_VERSION}. Check out the new features!`
         );
         
         
     } catch (error) {
         console.error('Error during update:', error);
     }
 }
 
 /**
  * Set default settings on first install
  */
 async function setDefaultSettings() {
     const defaultSettings = {
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
     
     await chrome.storage.sync.set({
         playwrightLocatorSettings: defaultSettings
     });
     
 }
 
 /**
  * Migrate settings from previous versions
  */
 async function migrateSettings(previousVersion) {
     try {
         const result = await chrome.storage.sync.get('playwrightLocatorSettings');
         let settings = result.playwrightLocatorSettings;
         
         if (!settings) {
             await setDefaultSettings();
             return;
         }
         
         // Version-specific migrations
         if (compareVersions(previousVersion, '2.0.0') < 0) {
             // Migrate from v1.x to v2.x
             settings = migrateFromV1(settings);
         }
         
         // Add any new settings with defaults
         settings = addMissingDefaults(settings);
         
         await chrome.storage.sync.set({
             playwrightLocatorSettings: settings
         });
         
         
     } catch (error) {
         console.error('Settings migration failed:', error);
         // Fallback to default settings
         await setDefaultSettings();
     }
 }
 
 /**
  * Tab update listener - inject content scripts when needed
  */
 chrome.tabs.onUpdated.addListener(async (tabId, changeInfo, tab) => {
     if (changeInfo.status !== 'complete' || !tab.url || !isValidUrl(tab.url)) {
         return;
     }
     
     try {
         // Pre-inject content scripts for better performance
         await ensureContentScriptInjected(tabId);
         
         
     } catch (error) {
         console.error(`Failed to inject content script for tab ${tabId}:`, error);
     }
 });
 
 /**
  * Tab activation listener
  */
 chrome.tabs.onActivated.addListener(async (activeInfo) => {
     try {
         const tab = await chrome.tabs.get(activeInfo.tabId);
         if (tab && isValidUrl(tab.url)) {
             // Update extension badge or state if needed
             await updateExtensionState(tab);
         }
     } catch (error) {
         console.error('Error handling tab activation:', error);
     }
 });
 
 /**
  * Message handler for inter-component communication
  */
 chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
     
     // Handle different message types
     switch (request.action) {
         case 'checkContentScript':
             sendResponse({ status: 'background_ready', version: EXTENSION_VERSION });
             return false;
             
         case 'getTabInfo':
             handleGetTabInfo(sendResponse);
             return true;
             
         case 'injectContentScript':
             handleInjectContentScript(request.tabId, sendResponse);
             return true;
             
         case 'settingsChanged':
             handleSettingsChanged(request.settings);
             return false;
             
         case 'validateLocator':
             handleLocatorValidation(request, sender, sendResponse);
             return true;
             
         case 'generateLocators':
             handleLocatorGeneration(request, sendResponse);
             return true;
             
             
         case 'contentScriptReady':
             return false;
             
         default:
             console.warn('Unknown action:', request.action);
             sendResponse({ error: 'Unknown action' });
             return false;
     }
 });
 
// Extension icon click handler - open/close side panel
chrome.action.onClicked.addListener(async (tab) => {
    
    try {
        // 检查 tab 是否有效
        if (!isValidUrl(tab.url)) {
            await showNotification(
                'Cannot use extension on this page',
                'Please navigate to a normal webpage to use Playwright Locator Helper.'
            );
            return;
        }
        
        // 关键：先打开 side panel（在用户手势上下文中）
        try {
            await chrome.sidePanel.open({ tabId: tab.id });
        } catch (sidePanelError) {
            console.error('Failed to open side panel:', sidePanelError);
            await showNotification(
                'Cannot open side panel',
                'Please try again or refresh the page.'
            );
            return; // 如果打开失败就直接返回
        }
        
        // 然后在后台注入 content script（不阻塞 UI）
        ensureContentScriptInjected(tab.id).then(() => {
        }).catch(error => {
            console.warn('Content script injection warning:', error.message);
            // 即使注入失败也不影响，用户打开页面时会自动注入
        });
        
        
    } catch (error) {
        console.error('Error in action.onClicked handler:', error);
    }
});
 
 /**
  * Command handler for keyboard shortcuts
  */
 chrome.commands.onCommand.addListener(async (command) => {
     
     try {
         const tabs = await chrome.tabs.query({ active: true, currentWindow: true });
         const activeTab = tabs[0];
         
         if (!activeTab || !isValidUrl(activeTab.url)) {
             await showNotification(
                 'Cannot use extension on this page',
                 'Please navigate to a normal webpage.'
             );
             return;
         }
         
         switch (command) {
             case 'start-element-selection':
                 await sendMessageToActiveTab({ action: 'startSelecting' });
                 break;
                 
             case 'open-side-panel':
                 try {
                     await chrome.sidePanel.open({ tabId: activeTab.id });
                 } catch (error) {
                     console.error('Failed to open side panel via command:', error);
                     // Send message to content script to show notification
                     if (!error.message.includes('may only be called in response to a user gesture')) {
                         await chrome.tabs.sendMessage(activeTab.id, { 
                             action: 'showNotification', 
                             title: 'Cannot open side panel',
                             message: 'Please click the extension icon instead.'
                         });
                     }
                 }
                 break;
                 
             case 'validate-locator':
                 await sendMessageToActiveTab({ action: 'validateCurrentLocator' });
                 break;
                 
             case 'copy-best-locator':
                 await sendMessageToActiveTab({ action: 'copyBestLocator' });
                 break;
         }
         
     } catch (error) {
         console.error('Error handling command:', error);
     }
 });
 
 /**
  * Settings change handler
  */
 function handleSettingsChanged(settings) {
     cachedSettings = settings;
     
     // Broadcast settings change to all extension pages
     broadcastMessage({ action: 'settingsUpdated', settings });
 }
 
 /**
  * Check if URL is valid for extension use
  */
 function isValidUrl(url) {
     if (!url) return false;
     return !RESTRICTED_URLS.some(restricted => url.startsWith(restricted));
 }
 
 /**
  * Ensure content script is injected in the specified tab
  */
async function ensureContentScriptInjected(tabId) {
    try {
        // 尝试与现有 content script 通信
        const response = await chrome.tabs.sendMessage(tabId, { action: 'ping' }, {frameId: 0});
        if (response && response.status) {
            return true; // Content script 已加载
        }
    } catch (error) {
        // Content script 未加载，需要注入
    }
    
    try {
        // 注入 CSS
        await chrome.scripting.insertCSS({
            target: { tabId: tabId },
            files: ['content/content.css']
        }).catch(error => {
            console.warn('CSS already injected or injection failed:', error.message);
        });
        
        // 注入 JavaScript
        await chrome.scripting.executeScript({
            target: { tabId: tabId },
            files: ['content/content.js']
        });
        
        
        // 等待 content script 初始化完成
        await new Promise(resolve => setTimeout(resolve, 500));
        
        return true;
        
    } catch (error) {
        console.error(`Failed to inject content script into tab ${tabId}:`, error);
        throw error;
    }
}

 /**
  * Handle tab info requests
  */
 async function handleGetTabInfo(sendResponse) {
     try {
         const tabs = await chrome.tabs.query({ active: true, currentWindow: true });
         if (tabs && tabs.length > 0) {
             const tab = tabs[0];
             sendResponse({
                 success: true,
                 tab: {
                     id: tab.id,
                     url: tab.url,
                     title: tab.title,
                     isValid: isValidUrl(tab.url)
                 }
             });
         } else {
             sendResponse({ success: false, error: 'No active tab found' });
         }
     } catch (error) {
         console.error('Error getting tab info:', error);
         sendResponse({ success: false, error: error.message });
     }
 }
 
 /**
  * Handle content script injection requests
  */
 async function handleInjectContentScript(tabId, sendResponse) {
     try {
         if (!tabId) {
             throw new Error('No tab ID provided');
         }
         
         await ensureContentScriptInjected(tabId);
         sendResponse({ success: true });
         
     } catch (error) {
         console.error('Error injecting content script:', error);
         sendResponse({ success: false, error: error.message });
     }
 }
 
 /**
  * Handle locator validation requests
  */
 async function handleLocatorValidation(request, sender, sendResponse) {
     try {
         // Forward validation request to content script
         const response = await chrome.tabs.sendMessage(sender.tab.id, {
             action: 'validateLocator',
             locator: request.locator
         });
         
         sendResponse(response);
         
     } catch (error) {
         console.error('Error validating locator:', error);
         sendResponse({ success: false, error: error.message });
     }
 }
 
/**
 * Handle locator generation requests - 转发到 content script
 */
 async function handleLocatorGeneration(request, sendResponse) {
    try {
        
        // 获取当前活动标签页
        const tabs = await chrome.tabs.query({ active: true, currentWindow: true });
        if (!tabs || tabs.length === 0) {
            sendResponse({ success: false, error: 'No active tab found' });
            return;
        }
        
        const tabId = tabs[0].id;
        
        // 转发到 content script 进行生成
        chrome.tabs.sendMessage(tabId, {
            action: 'generateLocatorsInContent',
            elementInfo: request.elementInfo
        }, (response) => {
            if (chrome.runtime.lastError) {
                console.error('Error forwarding to content script:', chrome.runtime.lastError);
                sendResponse({ 
                    success: false, 
                    error: 'Failed to communicate with content script' 
                });
            } else {
                sendResponse(response);
            }
        });
        
    } catch (error) {
        console.error('Error in handleLocatorGeneration:', error);
        sendResponse({ success: false, error: error.message });
    }
}


 /**
  * Update extension state based on current tab
  */
 async function updateExtensionState(tab) {
     try {
         // Update badge or icon based on tab state
         if (isValidUrl(tab.url)) {
             await chrome.action.setBadgeText({ text: '', tabId: tab.id });
             await chrome.action.setIcon({
                 path: {
                     16: 'images/icon16.png',
                     32: 'images/icon32.png'
                 },
                 tabId: tab.id
             });
         } else {
             await chrome.action.setBadgeText({ text: '!', tabId: tab.id });
             await chrome.action.setBadgeBackgroundColor({ color: '#ff6b6b', tabId: tab.id });
         }
     } catch (error) {
         console.error('Error updating extension state:', error);
     }
 }
 
 /**
  * Show notification to user
  */
 async function showNotification(title, message, iconUrl = 'images/icon48.png') {
     try {
         await chrome.notifications.create({
             type: 'basic',
             iconUrl: iconUrl,
             title: title,
             message: message
         });
     } catch (error) {
         console.error('Error showing notification:', error);
     }
 }
 
 /**
  * Send message to active tab
  */
 async function sendMessageToActiveTab(message) {
     try {
         const tabs = await chrome.tabs.query({ active: true, currentWindow: true });
         if (tabs.length > 0) {
             return await chrome.tabs.sendMessage(tabs[0].id, message);
         }
     } catch (error) {
         console.error('Error sending message to active tab:', error);
         throw error;
     }
 }
 
 /**
  * Broadcast message to all extension pages
  */
 async function broadcastMessage(message) {
     try {
         // Send to all tabs with content scripts
         const tabs = await chrome.tabs.query({});
         for (const tab of tabs) {
             if (isValidUrl(tab.url)) {
                 try {
                     await chrome.tabs.sendMessage(tab.id, message);
                 } catch (error) {
                     // Ignore tabs without content scripts
                 }
             }
         }
         
         // Send to extension pages (popup, options, etc.)
         const extensionViews = chrome.extension.getViews();
         extensionViews.forEach(view => {
             if (view.location.href.includes('chrome-extension://')) {
                 view.postMessage(message, '*');
             }
         });
         
     } catch (error) {
         console.error('Error broadcasting message:', error);
     }
 }
 /**
  * Utility functions
  */
 function compareVersions(version1, version2) {
     const v1parts = version1.split('.').map(Number);
     const v2parts = version2.split('.').map(Number);
     
     for (let i = 0; i < Math.max(v1parts.length, v2parts.length); i++) {
         const v1part = v1parts[i] || 0;
         const v2part = v2parts[i] || 0;
         
         if (v1part < v2part) return -1;
         if (v1part > v2part) return 1;
     }
     
     return 0;
 }
 
 function migrateFromV1(oldSettings) {
     // Convert v1.x settings format to v2.x
     return {
         locatorPreferences: {
             preferGetByRole: oldSettings.preferSemanticLocators !== false,
             preferGetByLabel: oldSettings.preferGetByLabel !== false,
             preferGetByText: oldSettings.preferGetByText !== false,
             preferGetByTitle: oldSettings.preferGetByTitle || false,
             preferCssSelectors: oldSettings.preferCssSelectors || false,
             preferDataAttributes: oldSettings.preferDataAttributes !== false
         },
         ui: {
             theme: oldSettings.theme || 'auto',
             language: oldSettings.language || 'auto'
         },
         advanced: {
             maxTextLength: oldSettings.maxTextLength || 100,
             includeDataAttributes: oldSettings.includeDataAttributes !== false,
             useExactMatch: oldSettings.useExactMatch || false,
             enableXPathSupport: oldSettings.enableXPathSupport || false,
             generatePageObjectCode: false,
             validationTimeout: oldSettings.timeout || 5
         }
     };
 }
 
 function addMissingDefaults(settings) {
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
     
     // Deep merge defaults with existing settings
     return deepMerge(defaults, settings);
 }
 
 function deepMerge(target, source) {
     const result = { ...target };
     
     for (const key in source) {
         if (source[key] && typeof source[key] === 'object' && !Array.isArray(source[key])) {
             result[key] = deepMerge(target[key] || {}, source[key]);
         } else {
             result[key] = source[key];
         }
     }
     
     return result;
 }
 
 // Extension lifecycle handlers
 chrome.runtime.onStartup.addListener(() => {
 });
 
 chrome.runtime.onSuspend.addListener(() => {
 });
 
 chrome.runtime.onSuspendCanceled.addListener(() => {
 });
 
 // Load cached settings on startup
 chrome.storage.sync.get('playwrightLocatorSettings').then(result => {
     cachedSettings = result.playwrightLocatorSettings;
 }).catch(error => {
     console.error('Error loading settings:', error);
 });
