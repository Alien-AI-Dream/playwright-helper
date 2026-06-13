/**
 * PageObject Manager - 管理 PageObject 的存储和生成
 * 支持保存到 Chrome Storage 和导出 JSON 文件
 */

class PageObjectManager {
    constructor() {
        this.storageKey = 'playwrightPageObjects';
        this.defaultTimeout = 10000;
    }

    /**
     * 初始化存储结构
     */
    async initialize() {
        const data = await chrome.storage.local.get(this.storageKey);
        if (!data[this.storageKey]) {
            await chrome.storage.local.set({
                [this.storageKey]: {
                    pages: {}
                }
            });
        }
        return this;
    }

    /**
     * 获取所有 PageObject 数据
     */
    async getPageObjects() {
        const data = await chrome.storage.local.get(this.storageKey);
        return data[this.storageKey] || { pages: {} };
    }

    /**
     * 获取指定 PageObject
     */
    async getPageObject(pageName) {
        const po = await this.getPageObjects();
        return po.pages[pageName] || null;
    }

    /**
     * 创建新的 PageObject 页面
     */
    async createPage(pageName, url = '', timeout = null) {
        const po = await this.getPageObjects();
        if (po.pages[pageName]) {
            throw new Error(`Page "${pageName}" already exists`);
        }

        po.pages[pageName] = {
            url: url,
            defaultTimeout: timeout || this.defaultTimeout,
            container: null,
            elements: {}
        };

        await chrome.storage.local.set({ [this.storageKey]: po });
        return po.pages[pageName];
    }

    /**
     * 删除 PageObject 页面
     */
    async deletePage(pageName) {
        const po = await this.getPageObjects();
        if (!po.pages[pageName]) {
            throw new Error(`Page "${pageName}" does not exist`);
        }

        delete po.pages[pageName];
        await chrome.storage.local.set({ [this.storageKey]: po });
        return true;
    }

    /**
     * 更新 PageObject 页面信息
     */
    async updatePage(pageName, updates) {
        const po = await this.getPageObjects();
        if (!po.pages[pageName]) {
            throw new Error(`Page "${pageName}" does not exist`);
        }

        if (updates.url !== undefined) {
            po.pages[pageName].url = updates.url;
        }
        if (updates.defaultTimeout !== undefined) {
            po.pages[pageName].defaultTimeout = updates.defaultTimeout;
        }
        if (updates.container !== undefined) {
            po.pages[pageName].container = updates.container;
        }

        await chrome.storage.local.set({ [this.storageKey]: po });
        return po.pages[pageName];
    }

    /**
     * 设置 PageObject 的 container
     */
    async setContainer(pageName, containerData) {
        const po = await this.getPageObjects();
        if (!po.pages[pageName]) {
            throw new Error(`Page "${pageName}" does not exist`);
        }

        po.pages[pageName].container = {
            description: containerData.description || '',
            locators: containerData.locators || []
        };

        await chrome.storage.local.set({ [this.storageKey]: po });
        return po.pages[pageName].container;
    }

    /**
     * 获取 PageObject 的 container
     */
    async getContainer(pageName) {
        const po = await this.getPageObjects();
        if (!po.pages[pageName]) {
            return null;
        }
        return po.pages[pageName].container || null;
    }

    /**
     * 删除 PageObject 的 container
     */
    async deleteContainer(pageName) {
        const po = await this.getPageObjects();
        if (!po.pages[pageName]) {
            throw new Error(`Page "${pageName}" does not exist`);
        }

        po.pages[pageName].container = null;
        await chrome.storage.local.set({ [this.storageKey]: po });
        return true;
    }

    /**
     * 添加元素到 PageObject
     */
    async addElement(pageName, elementName, elementData) {
        const po = await this.getPageObjects();
        if (!po.pages[pageName]) {
            throw new Error(`Page "${pageName}" does not exist`);
        }

        if (po.pages[pageName].elements[elementName]) {
            throw new Error(`Element "${elementName}" already exists in page "${pageName}"`);
        }

        po.pages[pageName].elements[elementName] = {
            type: elementData.type || 'unknown',
            description: elementData.description || '',
            locators: elementData.locators || []
        };

        await chrome.storage.local.set({ [this.storageKey]: po });
        return po.pages[pageName].elements[elementName];
    }

    /**
     * 更新 PageObject 中的元素
     */
    async updateElement(pageName, elementName, updates) {
        const po = await this.getPageObjects();
        if (!po.pages[pageName]) {
            throw new Error(`Page "${pageName}" does not exist`);
        }

        if (!po.pages[pageName].elements[elementName]) {
            throw new Error(`Element "${elementName}" does not exist in page "${pageName}"`);
        }

        const element = po.pages[pageName].elements[elementName];

        if (updates.type !== undefined) {
            element.type = updates.type;
        }
        if (updates.description !== undefined) {
            element.description = updates.description;
        }
        if (updates.locators !== undefined) {
            element.locators = updates.locators;
        }

        await chrome.storage.local.set({ [this.storageKey]: po });
        return element;
    }

    /**
     * 删除元素
     */
    async deleteElement(pageName, elementName) {
        const po = await this.getPageObjects();
        if (!po.pages[pageName]) {
            throw new Error(`Page "${pageName}" does not exist`);
        }

        if (!po.pages[pageName].elements[elementName]) {
            throw new Error(`Element "${elementName}" does not exist in page "${pageName}"`);
        }

        delete po.pages[pageName].elements[elementName];
        await chrome.storage.local.set({ [this.storageKey]: po });
        return true;
    }

    /**
     * 获取所有页面名称列表
     */
    async listPages() {
        const po = await this.getPageObjects();
        return Object.keys(po.pages);
    }

    /**
     * 获取指定页面的所有元素名称
     */
    async listElements(pageName) {
        const po = await this.getPageObjects();
        if (!po.pages[pageName]) {
            return [];
        }
        return Object.keys(po.pages[pageName].elements);
    }

    /**
     * 导出 PageObject 为 JSON 格式
     */
    async exportToJson() {
        const po = await this.getPageObjects();
        return JSON.stringify(po, null, 2);
    }

    /**
     * 从 JSON 导入 PageObject
     */
    async importFromJson(jsonString) {
        try {
            const data = JSON.parse(jsonString);
            if (!data.pages || typeof data.pages !== 'object') {
                throw new Error('Invalid PageObject format: missing "pages" object');
            }

            await chrome.storage.local.set({ [this.storageKey]: data });
            return data;
        } catch (error) {
            throw new Error(`Failed to import JSON: ${error.message}`);
        }
    }

    /**
     * 清空所有 PageObject 数据
     */
    async clearAll() {
        await chrome.storage.local.set({
            [this.storageKey]: { pages: {} }
        });
        return true;
    }

    /**
     * 将定位器转换为 JSON 格式
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

        // 解析 page.locator('xpath=selector')
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
window.pageObjectManager = new PageObjectManager();
