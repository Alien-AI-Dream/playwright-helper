// Playwright Locator Helper - Enhanced Content Script
console.log('🎯 Playwright Locator Helper content script loading...');

// 状态管理
let isSelecting = false;
let highlightedElement = null;

// 确保在DOM加载完成后初始化
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initializeContentScript);
} else {
    initializeContentScript();
}

function initializeContentScript() {
    // 防止重复注入
    if (window.playwrightLocatorHelperLoaded) {
        console.log('Content script already loaded, skipping...');
        try {
            // 回复 ping 请求表明已加载
            chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
                if (request.action === "ping") {
                    sendResponse({ status: "content_script_ready", timestamp: Date.now() });
                    return true;
                }
            });
        } catch (e) {
            console.log("Could not register ping listener");
        }
        return;
    }
    
    window.playwrightLocatorHelperLoaded = true;
    console.log('Content script initializing...');

    // 监听来自sidepanel的消息
    chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
        console.log('Content script received message:', request);

        try {
            let action = typeof request === 'string' ? request : request.action;

            // Ping测试 - 用于检查连接
            if (action === "ping") {
                console.log('Ping received, responding...');
                sendResponse({ status: "content_script_ready", timestamp: Date.now() });
                return true;
            }

            // 开始选择模式
            if (action === "startSelecting") {
                console.log('Starting selection mode');
                startSelectionMode();
                sendResponse({ status: "selection_started" });
                return true;
            }

            // 停止选择模式
            if (action === "stopSelecting") {
                console.log('Stopping selection mode');
                stopSelectionMode();
                sendResponse({ status: "selection_stopped" });
                return true;
            }

            // 验证定位器
            if (action === "validateLocator") {
                console.log('Validating locator:', request.locator);
                validateLocator(request.locator, sendResponse);
                return true; // 异步响应
            }
            
        } catch (error) {
            console.error('Error processing message:', error);
            sendResponse({ status: "error", message: error.message });
        }

        return false;
    });

    // 发送消息给background script表示content script已就绪
    try {
        chrome.runtime.sendMessage({ action: "contentScriptReady" });
    } catch (error) {
        console.log("Could not send ready message to background script:", error);
    }
    
    console.log('✅ Content script initialized successfully');
}

// ========== 元素选择功能 ==========

function startSelectionMode() {
    isSelecting = true;
    document.body.style.cursor = 'crosshair';
    console.log('Selection mode activated');
}

function stopSelectionMode() {
    isSelecting = false;
    document.body.style.cursor = 'default';
    removeAllHighlights();
    console.log('Selection mode deactivated');
}

// 点击事件 - 选择元素
document.addEventListener('click', (event) => {
    if (!isSelecting) return;
    
    event.preventDefault();
    event.stopPropagation();
    
    const element = event.target;
    console.log('Element clicked:', element);
    
    // 提取元素信息
    const elementInfo = extractElementInfo(element);
    console.log('Element info extracted:', elementInfo);
    
    // 停止选择模式
    stopSelectionMode();
    
    // 发送到 sidepanel
    try {
        chrome.runtime.sendMessage({
            action: 'elementSelected',
            data: elementInfo
        }, (response) => {
            if (chrome.runtime.lastError) {
                console.error('Failed to send element info:', chrome.runtime.lastError);
            } else {
                console.log('Element info sent successfully');
            }
        });
    } catch (error) {
        console.error('Error sending element info:', error);
    }
    
}, true); // 使用捕获阶段，优先级更高

// 鼠标悬停 - 高亮显示
document.addEventListener('mouseover', (event) => {
    if (!isSelecting) return;
    
    removeAllHighlights();
    highlightedElement = event.target;
    
    if (highlightedElement) {
        highlightedElement.classList.add('playwright-locator-highlight');
    }
}, true);

// 鼠标移出 - 移除高亮
document.addEventListener('mouseout', (event) => {
    if (!isSelecting) return;
    
    if (event.target === highlightedElement) {
        event.target.classList.remove('playwright-locator-highlight');
        highlightedElement = null;
    }
}, true);

// ========== 元素信息提取 ==========

function extractElementInfo(element) {
    const info = {
        tagName: element.tagName,
        textContent: element.textContent?.trim().replace(/\s+/g, ' ').substring(0, 100) || '',
        id: element.id || '',
        className: element.className || '',
        name: element.name || '',
        type: element.type || '',
        value: element.value || '',
        placeholder: element.placeholder || '',
        title: element.title || '',
        alt: element.alt || '',
        href: element.href || '',
        role: element.getAttribute('role') || '',
        'aria-label': element.getAttribute('aria-label') || '',
        'aria-labelledby': element.getAttribute('aria-labelledby') || '',
        'aria-checked': element.getAttribute('aria-checked') || '',
        'aria-disabled': element.getAttribute('aria-disabled') || '',
        'aria-expanded': element.getAttribute('aria-expanded') || '',
        'aria-pressed': element.getAttribute('aria-pressed') || '',
        'aria-selected': element.getAttribute('aria-selected') || '',
        'aria-level': element.getAttribute('aria-level') || '',
    };
    
    // 获取 data 属性
    for (const attr of element.attributes) {
        if (attr.name.startsWith('data-')) {
            info[attr.name] = attr.value;
        }
    }
    
    // 获取关联的 label 文本
    if (element.id) {
        const label = document.querySelector(`label[for="${element.id}"]`);
        if (label) {
            info.labelText = label.textContent?.trim() || '';
        }
    }
    
    // 获取 checked 和 disabled 状态
    if (element.hasAttribute('checked')) {
        info.checked = element.checked;
    }
    if (element.hasAttribute('disabled')) {
        info.disabled = element.disabled;
    }
    
    // 获取 labelledby 引用的文本
    if (info['aria-labelledby']) {
        const labelledbyIds = info['aria-labelledby'].split(' ');
        const labelledbyTexts = labelledbyIds
            .map(id => document.getElementById(id)?.textContent?.trim())
            .filter(text => text);
        if (labelledbyTexts.length > 0) {
            info.labelledbyText = labelledbyTexts.join(' ');
        }
    }
    
    return info;
}

// ========== 定位器验证 ==========

function validateLocator(locatorExpression, sendResponse) {
    try {
        console.log('Validating locator:', locatorExpression);
        removeAllHighlights();
        
        let selector = null;
        let matchType = null;
        
        // 解析不同类型的定位器
        if (locatorExpression.includes('page.locator')) {
            // CSS 选择器: page.locator('#id') 或 page.locator('input[type="checkbox"]')
            // 使用反向引用 \1 匹配成对引号，支持选择器内部包含另一种引号
            const match = locatorExpression.match(/page\.locator\((['"])(.+?)\1\)/);
            if (match) {
                selector = match[2];
                matchType = 'css';
            }
        } else if (locatorExpression.includes('get_by_text')) {
            // 文本定位器: page.get_by_text('text')
            const match = locatorExpression.match(/get_by_text\((['"])(.+?)\1\)/);
            if (match) {
                const text = match[2];
                
                // 查找完全匹配的元素
                const exactMatchElements = Array.from(document.querySelectorAll('*')).filter(el => {
                    const elementText = el.textContent?.trim();
                    return elementText === text;
                });
                
                if (exactMatchElements.length > 0) {
                    // 如果有完全匹配的元素，只高亮第一个
                    highlightElement(exactMatchElements[0]);
                    sendResponse({ success: true, count: 1 });
                } else {
                    // 否则查找包含关系的元素
                    const partialMatchElements = Array.from(document.querySelectorAll('*')).filter(el => {
                        const elementText = el.textContent?.trim();
                        return elementText && elementText.includes(text);
                    });
                    
                    if (partialMatchElements.length > 0) {
                        // 只高亮第一个包含关系的元素
                        highlightElement(partialMatchElements[0]);
                        sendResponse({ success: true, count: 1 });
                    } else {
                        sendResponse({ success: false, error: 'No elements with matching text found' });
                    }
                }
                return;
            }
        } else if (locatorExpression.includes('get_by_placeholder')) {
            // 占位符定位器: page.get_by_placeholder('text')
            const match = locatorExpression.match(/get_by_placeholder\((['"])(.+?)\1\)/);
            if (match) {
                const placeholderText = match[2];
                matchType = 'placeholder';
                
                // 查找具有匹配placeholder属性的input、textarea元素
                const elements = Array.from(document.querySelectorAll('input[placeholder], textarea[placeholder]'))
                    .filter(el => el.placeholder === placeholderText);
                
                if (elements.length > 0) {
                    elements.forEach(el => highlightElement(el));
                    sendResponse({ success: true, count: elements.length });
                } else {
                    sendResponse({ success: false, error: `No elements with placeholder="${placeholderText}" found` });
                }
                return;
            }
        } else if (locatorExpression.includes('get_by_label')) {
            // 标签定位器: page.get_by_label('label text')
            const match = locatorExpression.match(/get_by_label\((['"])(.+?)\1\)/);
            if (match) {
                const labelText = match[2];
                matchType = 'label';

                const labels = Array.from(document.querySelectorAll('label')).filter(
                    el => el.textContent?.trim() === labelText
                );
                let elements = [];
                for (const label of labels) {
                    if (label.htmlFor) {
                        const target = document.getElementById(label.htmlFor);
                        if (target) elements.push(target);
                    } else {
                        const input = label.querySelector('input, select, textarea');
                        if (input) elements.push(input);
                    }
                }
                if (elements.length > 0) {
                    elements.forEach(el => highlightElement(el));
                    sendResponse({ success: true, count: elements.length });
                } else {
                    sendResponse({ success: false, error: `No elements found with label "${labelText}"` });
                }
                return;
            }
        } else if (locatorExpression.includes('get_by_title')) {
            // 标题定位器: page.get_by_title('title text')
            const match = locatorExpression.match(/get_by_title\((['"])(.+?)\1\)/);
            if (match) {
                const titleText = match[2];
                const elements = document.querySelectorAll(`[title="${titleText}"]`);
                if (elements.length > 0) {
                    elements.forEach(el => highlightElement(el));
                    sendResponse({ success: true, count: elements.length });
                } else {
                    sendResponse({ success: false, error: `No elements found with title="${titleText}"` });
                }
                return;
            }
        } else if (locatorExpression.includes('get_by_role')) {
            // 角色定位器: page.get_by_role('button', name='Submit')
            const roleMatch = locatorExpression.match(/get_by_role\((['"])(\w+)\1/);
            const nameMatch = locatorExpression.match(/name\s*=\s*(['"])(.+?)\1/);
            
            if (roleMatch) {
                const role = roleMatch[2];
                const name = nameMatch ? nameMatch[2] : null;
                
                // 更全面地查找具有指定角色的元素，不仅限于显式的role属性
                const elements = findElementsByRole(role);
                let found = elements;
                
                if (name) {
                    found = elements.filter(el => {
                        // 获取元素的可访问名称
                        const accessibleName = getAccessibleName(el);
                        
                        // 检查可访问名称是否匹配（支持部分匹配）
                        return accessibleName && 
                               (accessibleName.trim() === name || 
                                accessibleName.trim().includes(name) ||
                                name.includes(accessibleName.trim()));
                    });
                }
                
                if (found.length > 0) {
                    found.forEach(el => highlightElement(el));
                    sendResponse({ success: true, count: found.length });
                } else {
                    // 改进错误消息以反映查找条件
                    const errorMsg = name 
                        ? `No elements found with role="${role}" and name matching "${name}"`
                        : `No elements found with role="${role}"`;
                    sendResponse({ success: false, error: errorMsg });
                }
                return;
            }
        }
        
        // 使用 CSS 选择器
        if (selector && matchType === 'css') {
            const elements = document.querySelectorAll(selector);
            if (elements.length > 0) {
                elements.forEach(el => highlightElement(el));
                sendResponse({ success: true, count: elements.length });
            } else {
                sendResponse({ success: false, error: 'No elements match the selector' });
            }
        } else if (!selector) {
            sendResponse({ 
                success: false, 
                error: 'Unable to parse locator expression. Supported formats: page.locator(), get_by_text(), get_by_label(), get_by_placeholder(), get_by_title(), get_by_role()'
            });
        }
    } catch (error) {
        console.error('Validation error:', error);
        sendResponse({ success: false, error: error.message });
    }
}

// 根据角色查找元素的辅助函数
function findElementsByRole(role) {
    // 首先查找具有显式role属性的元素
    let elements = Array.from(document.querySelectorAll(`[role="${role}"]`));
    
    // 根据角色类型添加具有隐式角色的HTML元素
    switch (role) {
        case 'button':
            // 包括<button>和<input type="button">等元素
            elements = elements.concat(
                Array.from(document.querySelectorAll('button')),
                Array.from(document.querySelectorAll('input[type="button"]')),
                Array.from(document.querySelectorAll('input[type="submit"]')),
                Array.from(document.querySelectorAll('input[type="reset"]'))
            );
            break;
        case 'link':
            elements = elements.concat(Array.from(document.querySelectorAll('a[href]')));
            break;
        case 'textbox':
            elements = elements.concat(
                Array.from(document.querySelectorAll('input[type="text"]')),
                Array.from(document.querySelectorAll('input[type="email"]')),
                Array.from(document.querySelectorAll('input[type="password"]')),
                Array.from(document.querySelectorAll('input[type="search"]')),
                Array.from(document.querySelectorAll('input[type="tel"]')),
                Array.from(document.querySelectorAll('input[type="url"]')),
                Array.from(document.querySelectorAll('input:not([type])')), // 没有type属性的input默认为text
                Array.from(document.querySelectorAll('textarea'))
            );
            break;
        case 'checkbox':
            elements = elements.concat(Array.from(document.querySelectorAll('input[type="checkbox"]')));
            break;
        case 'radio':
            elements = elements.concat(Array.from(document.querySelectorAll('input[type="radio"]')));
            break;
        case 'combobox':
            elements = elements.concat(Array.from(document.querySelectorAll('select')));
            break;
        case 'heading':
            elements = elements.concat(
                Array.from(document.querySelectorAll('h1')),
                Array.from(document.querySelectorAll('h2')),
                Array.from(document.querySelectorAll('h3')),
                Array.from(document.querySelectorAll('h4')),
                Array.from(document.querySelectorAll('h5')),
                Array.from(document.querySelectorAll('h6'))
            );
            break;
        case 'list':
            elements = elements.concat(
                Array.from(document.querySelectorAll('ul')),
                Array.from(document.querySelectorAll('ol'))
            );
            break;
        case 'listitem':
            elements = elements.concat(Array.from(document.querySelectorAll('li')));
            break;
        case 'navigation':
            elements = elements.concat(Array.from(document.querySelectorAll('nav')));
            break;
        case 'main':
            elements = elements.concat(Array.from(document.querySelectorAll('main')));
            break;
        case 'img':
            elements = elements.concat(Array.from(document.querySelectorAll('img[alt]')));
            break;
    }
    
    // 去除重复元素
    return [...new Set(elements)];
}

// 获取元素的可访问名称的辅助函数
function getAccessibleName(element) {
    // 1. aria-label属性
    const ariaLabel = element.getAttribute('aria-label');
    if (ariaLabel) return ariaLabel;
    
    // 2. aria-labelledby属性
    const ariaLabelledBy = element.getAttribute('aria-labelledby');
    if (ariaLabelledBy) {
        const labelElement = document.getElementById(ariaLabelledBy);
        if (labelElement) return labelElement.textContent?.trim() || '';
    }
    
    // 3. 元素本身的文本内容
    const textContent = element.textContent?.trim();
    if (textContent) return textContent;
    
    // 4. 特定元素的属性
    if (element.hasAttribute('title')) {
        return element.getAttribute('title');
    }
    
    if (element.hasAttribute('placeholder')) {
        return element.getAttribute('placeholder');
    }
    
    if (element.hasAttribute('alt') && (element.tagName.toLowerCase() === 'img' || 
                                       element.tagName.toLowerCase() === 'area')) {
        return element.getAttribute('alt');
    }
    
    if (element.hasAttribute('value') && (element.tagName.toLowerCase() === 'input' ||
                                         element.tagName.toLowerCase() === 'textarea')) {
        return element.getAttribute('value');
    }
    
    return '';
}

// ========== 高亮显示工具函数 ==========

function highlightElement(element) {
    if (!element) return;
    
    element.classList.add('playwright-locator-highlight');
    element.scrollIntoView({ behavior: 'smooth', block: 'center' });
    
    // 3秒后自动移除高亮
    setTimeout(() => {
        element.classList.remove('playwright-locator-highlight');
    }, 3000);
}

function removeAllHighlights() {
    document.querySelectorAll('.playwright-locator-highlight').forEach(el => {
        el.classList.remove('playwright-locator-highlight');
    });
    highlightedElement = null;
}

// Esc 键取消选择
document.addEventListener('keydown', (event) => {
    if (event.key === 'Escape' && isSelecting) {
        stopSelectionMode();
        console.log('Selection cancelled by Esc key');
    }
});

console.log('Content script setup complete');

// ========== Playwright Locator Generator ==========
// 将定位器生成器放在 content script 中，因为 background script 没有 window 对象

// Valid ARIA roles
const VALID_ARIA_ROLES = new Set([
    "alert", "alertdialog", "application", "article", "banner", "blockquote", 
    "button", "caption", "cell", "checkbox", "code", "columnheader", "combobox", 
    "complementary", "contentinfo", "definition", "deletion", "dialog", "directory", 
    "document", "emphasis", "feed", "figure", "form", "generic", "grid", "gridcell", 
    "group", "heading", "img", "insertion", "link", "list", "listbox", "listitem", 
    "log", "main", "marquee", "math", "menu", "menubar", "menuitem", "menuitemcheckbox", 
    "menuitemradio", "meter", "navigation", "none", "note", "option", "paragraph", 
    "presentation", "progressbar", "radio", "radiogroup", "region", "row", "rowgroup", 
    "rowheader", "scrollbar", "search", "searchbox", "separator", "slider", "spinbutton", 
    "status", "strong", "subscript", "superscript", "switch", "tab", "table", "tablist", 
    "tabpanel", "term", "textbox", "time", "timer", "toolbar", "tooltip", "tree", 
    "treegrid", "treeitem"
]);

class PlaywrightLocatorGenerator {
    generateLocators(elementInfo) {
        const locators = [];
        
        // 1. get_by_role (优先)
        const roleLocator = this._generateByRole(elementInfo);
        if (roleLocator) locators.push(roleLocator);
        
        // 2. get_by_label
        if (elementInfo.labelText) {
            locators.push(`page.get_by_label('${this._escape(elementInfo.labelText)}')`);
        }
        
        // 3. get_by_placeholder
        if (elementInfo.placeholder) {
            locators.push(`page.get_by_placeholder('${this._escape(elementInfo.placeholder)}')`);
        }
        
        // 4. get_by_text
        if (elementInfo.textContent && elementInfo.textContent.length < 100) {
            locators.push(`page.get_by_text('${this._escape(elementInfo.textContent)}')`);
        }
        
        // 5. get_by_title
        if (elementInfo.title) {
            locators.push(`page.get_by_title('${this._escape(elementInfo.title)}')`);
        }
        
        // 6. CSS selectors
        const tagName = (elementInfo.tagName || '').toLowerCase();

        // tag + type attribute: input[type="checkbox"]
        if (elementInfo.type && tagName) {
            locators.push(`page.locator('${tagName}[type="${this._escape(elementInfo.type)}"]')`);
        }

        // tag + name attribute: input[name="termsAgreed"]
        if (elementInfo.name && tagName) {
            locators.push(`page.locator('${tagName}[name="${this._escape(elementInfo.name)}"]')`);
        }

        // tag#id
        if (elementInfo.id && tagName) {
            locators.push(`page.locator('${tagName}#${this._escape(elementInfo.id)}')`);
        }

        // class selectors
        if (elementInfo.className) {
            const classes = String(elementInfo.className)
                .trim()
                .split(/\s+/)
                .filter(className => className && !this._isDynamicClassName(className));

            if (classes.length > 0) {
                locators.push(`page.locator('.${this._escape(classes[0])}')`);
                if (tagName) {
                    locators.push(`page.locator('${tagName}.${this._escape(classes[0])}')`);
                }
            }
        }

        // data-testid and other data- attributes
        for (const [key, value] of Object.entries(elementInfo)) {
            if (key.startsWith('data-') && value) {
                locators.push(`page.locator('[${key}="${this._escape(value)}"]')`);
            }
        }
        
        return locators;
    }
    
    _generateByRole(elementInfo) {
        const role = elementInfo.role || this._inferRole(elementInfo);
        if (!role || !VALID_ARIA_ROLES.has(role)) return null;
        
        // 获取元素的可访问名称，按优先级排序
        // 1. aria-label属性
        if (elementInfo['aria-label']) {
            return `page.get_by_role('${role}', name='${this._escape(elementInfo['aria-label'])}')`;
        }
        
        // 2. aria-labelledby属性引用的文本
        if (elementInfo.labelledbyText) {
            return `page.get_by_role('${role}', name='${this._escape(elementInfo.labelledbyText)}')`;
        }
        
        // 3. 关联的<label>元素的文本
        if (elementInfo.labelText) {
            return `page.get_by_role('${role}', name='${this._escape(elementInfo.labelText)}')`;
        }
        
        // 4. 元素本身的文本内容
        if (elementInfo.textContent) {
            return `page.get_by_role('${role}', name='${this._escape(elementInfo.textContent)}')`;
        }
        
        // 5. value属性（适用于某些input元素）
        if (elementInfo.value) {
            return `page.get_by_role('${role}', name='${this._escape(elementInfo.value)}')`;
        }
        
        // 6. placeholder属性
        if (elementInfo.placeholder) {
            return `page.get_by_role('${role}', name='${this._escape(elementInfo.placeholder)}')`;
        }
        
        // 7. title属性
        if (elementInfo.title) {
            return `page.get_by_role('${role}', name='${this._escape(elementInfo.title)}')`;
        }
        
        // 如果没有任何可访问名称，则只返回角色定位器
        return `page.get_by_role('${role}')`;
    }
    
    _inferRole(elementInfo) {
        const tag = (elementInfo.tagName || '').toLowerCase();
        const type = (elementInfo.type || '').toLowerCase();
        
        const roleMap = {
            'button': 'button',
            'a': elementInfo.href ? 'link' : null,
            'input': type === 'checkbox' ? 'checkbox' : 
                     type === 'radio' ? 'radio' : 
                     type === 'button' || type === 'submit' || type === 'reset' ? 'button' : 'textbox',
            'textarea': 'textbox',
            'select': 'combobox',
            'h1': 'heading', 'h2': 'heading', 'h3': 'heading',
            'h4': 'heading', 'h5': 'heading', 'h6': 'heading',
            'img': elementInfo.alt ? 'img' : null,
            'nav': 'navigation',
            'main': 'main',
            'ul': 'list',
            'ol': 'list',
            'li': 'listitem'
        };
        
        // 特殊处理没有type属性的input元素 - 默认为textbox
        if (tag === 'input' && !type) {
            return 'textbox';
        }
        
        return roleMap[tag] || elementInfo.role || null;
    }
    
    _escape(str) {
        if (!str) return '';
        return String(str).replace(/\\/g, '\\\\').replace(/'/g, "\\'");
    }

    _isDynamicClassName(className) {
        const normalized = String(className || '').trim();
        if (!normalized) return true;

        // Examples: m_f2d85dd2, x_a1b2c3d4. These are usually generated hashes.
        if (/^[a-z]{1,3}_[a-f0-9]{6,}$/i.test(normalized)) {
            return true;
        }

        // Avoid pure hash-like class names.
        if (/^[a-f0-9]{8,}$/i.test(normalized)) {
            return true;
        }

        return false;
    }
}

// 监听生成定位器的请求
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    if (request.action === 'generateLocatorsInContent') {
        try {
            const generator = new PlaywrightLocatorGenerator();
            const locators = generator.generateLocators(request.elementInfo);
            sendResponse({ success: true, locators: locators });
        } catch (error) {
            sendResponse({ success: false, error: error.message });
        }
        return true;
    }
});

// ========== PageObject JSON 生成器 ==========

class PageObjectElementGenerator {
    /**
     * 将元素信息和定位器转换为 PageObject JSON 格式
     */
    generateElementJSON(elementInfo, locators) {
        return {
            type: this.inferElementType(elementInfo),
            description: this.generateDescription(elementInfo),
            locators: locators.map(locator => this.parseLocatorToJSON(locator))
        };
    }

    /**
     * 推断元素类型
     */
    inferElementType(elementInfo) {
        const tagName = (elementInfo.tagName || '').toLowerCase();
        const type = (elementInfo.type || '').toLowerCase();

        const typeMap = {
            'input': {
                'checkbox': 'checkbox',
                'radio': 'radio',
                'button': 'button',
                'submit': 'button',
                'text': 'input',
                'email': 'input',
                'password': 'input',
                'number': 'input',
                'tel': 'input',
                'url': 'input',
                'search': 'input'
            },
            'button': 'button',
            'a': 'link',
            'select': 'select',
            'textarea': 'input',
            'iframe': 'iframe'
        };

        if (tagName === 'input' && typeMap.input[type]) {
            return typeMap.input[type];
        }

        return typeMap[tagName] || 'input';
    }

    /**
     * 生成元素描述
     */
    generateDescription(elementInfo) {
        const parts = [];

        // 标签名
        if (elementInfo.tagName) {
            parts.push(elementInfo.tagName.toLowerCase());
        }

        // 文本内容（如果简短）
        if (elementInfo.textContent && elementInfo.textContent.length < 50) {
            parts.push(`"${elementInfo.textContent}"`);
        }

        // ID
        if (elementInfo.id) {
            parts.push(`id="${elementInfo.id}"`);
        }

        // 类型
        if (elementInfo.type && elementInfo.tagName === 'INPUT') {
            parts.push(`type="${elementInfo.type}"`);
        }

        return parts.join(', ');
    }

    /**
     * 将定位器字符串解析为 JSON 格式
     */
    parseLocatorToJSON(locatorString) {
        const result = {
            strategy: 'locator',
            value: '',
            type: 'css'
        };

        // 解析 page.get_by_role('button', name='Submit')
        const roleMatch = locatorString.match(/get_by_role\(['"](\w+)['"](?:,\s*name=['"]([^'"]+)['"])?\)/);
        if (roleMatch) {
            result.strategy = 'getByRole';
            result.value = roleMatch[1];
            if (roleMatch[2]) {
                result.options = { name: roleMatch[2], exact: true };
            }
            return result;
        }

        // 解析 page.get_by_label('label')
        const labelMatch = locatorString.match(/get_by_label\(['"]([^'"]+)['"]\)/);
        if (labelMatch) {
            result.strategy = 'getByLabel';
            result.value = labelMatch[1];
            return result;
        }

        // 解析 page.get_by_placeholder('placeholder')
        const placeholderMatch = locatorString.match(/get_by_placeholder\(['"]([^'"]+)['"]\)/);
        if (placeholderMatch) {
            result.strategy = 'getByPlaceholder';
            result.value = placeholderMatch[1];
            return result;
        }

        // 解析 page.get_by_text('text')
        const textMatch = locatorString.match(/get_by_text\(['"]([^'"]+)['"]\)/);
        if (textMatch) {
            result.strategy = 'getByText';
            result.value = textMatch[1];
            return result;
        }

        // 解析 page.get_by_title('title')
        const titleMatch = locatorString.match(/get_by_title\(['"]([^'"]+)['"]\)/);
        if (titleMatch) {
            result.strategy = 'getByTitle';
            result.value = titleMatch[1];
            return result;
        }

        // 解析 page.locator('selector')
        const locatorMatch = locatorString.match(/page\.locator\(['"]([^'"]+)['"]\)/);
        if (locatorMatch) {
            result.strategy = 'locator';
            result.value = locatorMatch[1];
            result.type = 'css';
            return result;
        }

        // 解析 xpath
        const xpathMatch = locatorString.match(/page\.locator\(['"]xpath=([^'"]+)['"]\)/);
        if (xpathMatch) {
            result.strategy = 'locator';
            result.value = xpathMatch[1];
            result.type = 'xpath';
            return result;
        }

        // 默认情况
        result.value = locatorString;
        return result;
    }
}

// 创建全局实例
window.pageObjectElementGenerator = new PageObjectElementGenerator();

// 监听 PageObject 元素生成请求
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    if (request.action === 'generatePageObjectElement') {
        try {
            const generator = window.pageObjectElementGenerator;
            const elementJSON = generator.generateElementJSON(request.elementInfo, request.locators);
            sendResponse({ success: true, element: elementJSON });
        } catch (error) {
            sendResponse({ success: false, error: error.message });
        }
        return true;
    }
});
