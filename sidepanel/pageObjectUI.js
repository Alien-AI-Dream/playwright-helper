/**
 * PageObject UI Manager - 处理 PageObject 相关的 UI 交互
 */

class PageObjectUIManager {
    constructor() {
        this.pageObjectManager = null;
        this.currentElementData = null;
        this.currentLocators = [];
        this.modal = null;
        this.viewerModal = null;
        this.containerModal = null;
        this.currentContainerLocators = [];
    }

    /**
     * 初始化 UI 管理器
     */
    async initialize(pageObjectManager) {
        this.pageObjectManager = pageObjectManager;
        await this.pageObjectManager.initialize();
        this.bindEvents();
        console.log('PageObjectUIManager initialized');
        return this;
    }

    /**
     * 绑定事件监听器
     */
    bindEvents() {
        // 保存元素对话框事件
        const closeBtn = document.getElementById('closePageObjectModal');
        if (closeBtn) {
            closeBtn.addEventListener('click', () => this.hideSaveElementModal());
        }

        const cancelBtn = document.getElementById('cancelSaveElement');
        if (cancelBtn) {
            cancelBtn.addEventListener('click', () => this.hideSaveElementModal());
        }

        document.getElementById('confirmSaveElement')?.addEventListener('click', () => this.saveElement());
        document.getElementById('refreshPageList')?.addEventListener('click', () => this.refreshPageList());
        document.getElementById('pageSelect')?.addEventListener('change', (e) => this.onPageSelect(e));

        // 保存 Container 对话框事件
        const closeContainerModalBtn = document.getElementById('closeSaveContainerModal');
        if (closeContainerModalBtn) {
            closeContainerModalBtn.addEventListener('click', () => this.hideSaveContainerModal());
        }

        const cancelContainerBtn = document.getElementById('cancelSaveContainer');
        if (cancelContainerBtn) {
            cancelContainerBtn.addEventListener('click', () => this.hideSaveContainerModal());
        }

        document.getElementById('confirmSaveContainer')?.addEventListener('click', () => this.saveContainer());
        document.getElementById('refreshContainerPageList')?.addEventListener('click', () => this.refreshContainerPageList());

        // 查看器对话框事件
        const closeViewerBtn = document.getElementById('closePageObjectViewer');
        if (closeViewerBtn) {
            closeViewerBtn.addEventListener('click', () => this.hideViewerModal());
        }

        document.getElementById('closeViewerBtn')?.addEventListener('click', () => this.hideViewerModal());
        document.getElementById('refreshViewerBtn')?.addEventListener('click', () => this.refreshViewer());
        document.getElementById('viewerPageSelect')?.addEventListener('change', (e) => this.onViewerPageSelect(e));
        document.getElementById('exportJsonBtn')?.addEventListener('click', () => this.exportJson());
        document.getElementById('importJsonBtn')?.addEventListener('click', () => this.triggerImportJson());
        document.getElementById('copyJsonBtn')?.addEventListener('click', () => this.copyJson());
        document.getElementById('jsonFileInput')?.addEventListener('change', (e) => this.handleFileImport(e));

        // 创建 PageObject 按钮事件（Viewer 中）
        document.getElementById('createPageObjectBtn')?.addEventListener('click', () => this.showCreatePageObjectSection());
        document.getElementById('createPageViewerBtn')?.addEventListener('click', () => this.createPageFromViewer());
        document.getElementById('cancelCreatePageViewerBtn')?.addEventListener('click', () => this.hideCreatePageObjectSection());

        // 点击遮罩层关闭
        document.querySelectorAll('.modal-overlay').forEach(overlay => {
            overlay.addEventListener('click', (e) => {
                if (e.target === overlay) {
                    this.hideSaveElementModal();
                    this.hideViewerModal();
                    this.hideSaveContainerModal();
                }
            });
        });

        // ESC 键关闭对话框
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape') {
                this.hideSaveElementModal();
                this.hideViewerModal();
                this.hideCreatePageObjectSection();
                this.hideSaveContainerModal();
            }
        });
    }

    /**
     * 显示保存元素对话框
     */
    async showSaveElementModal(elementData, locators) {
        this.currentElementData = elementData;
        this.currentLocators = [...locators]; // 创建副本以便可以独立修改

        // 重置表单
        document.getElementById('elementName').value = '';
        document.getElementById('elementDescription').value = '';

        // 填充元素类型
        const elementType = this.inferElementType(elementData);
        document.getElementById('elementType').value = elementType;

        // 更新定位器预览
        this.updateLocatorPreview(this.currentLocators);

        // 加载页面列表
        await this.refreshPageList();

        // 显示对话框
        this.modal = document.getElementById('pageObjectModal');
        console.log('[ShowModal] Modal element found:', !!this.modal);
        if (this.modal) {
            this.modal.style.display = 'flex';
            console.log('[ShowModal] Modal display set to flex');
        } else {
            console.error('[ShowModal] Modal element not found!');
            throw new Error('Modal element not found');
        }
    }

    /**
     * 隐藏保存元素对话框
     */
    hideSaveElementModal() {
        if (this.modal) {
            this.modal.style.display = 'none';
            this.modal = null;
        }
        this.currentElementData = null;
        this.currentLocators = [];
    }

    /**
     * 显示查看器对话框
     */
    async showViewerModal() {
        await this.refreshViewerPageList();
        this.viewerModal = document.getElementById('pageObjectViewerModal');
        if (this.viewerModal) {
            this.viewerModal.style.display = 'flex';
        }
    }

    /**
     * 隐藏查看器对话框
     */
    hideViewerModal() {
        if (this.viewerModal) {
            this.viewerModal.style.display = 'none';
            this.viewerModal = null;
        }
    }

    /**
     * 刷新页面列表
     */
    async refreshPageList() {
        const pageSelect = document.getElementById('pageSelect');
        if (!pageSelect) return;

        const pages = await this.pageObjectManager.listPages();

        pageSelect.innerHTML = '<option value="">-- Select existing or create new --</option>';

        pages.forEach(pageName => {
            const option = document.createElement('option');
            option.value = pageName;
            option.textContent = pageName;
            pageSelect.appendChild(option);
        });
    }

    /**
     * 刷新查看器页面列表
     */
    async refreshViewerPageList() {
        const viewerSelect = document.getElementById('viewerPageSelect');
        if (!viewerSelect) return;

        const pages = await this.pageObjectManager.listPages();

        viewerSelect.innerHTML = '<option value="">-- Select PageObject --</option>';

        pages.forEach(pageName => {
            const option = document.createElement('option');
            option.value = pageName;
            option.textContent = pageName;
            viewerSelect.appendChild(option);
        });
    }

    /**
     * 显示创建 PageObject 区域
     */
    showCreatePageObjectSection() {
        const section = document.getElementById('createPageObjectSection');
        if (section) {
            section.style.display = 'block';
            document.getElementById('newPageNameViewer')?.focus();
        }
    }

    /**
     * 隐藏创建 PageObject 区域
     */
    hideCreatePageObjectSection() {
        const section = document.getElementById('createPageObjectSection');
        if (section) {
            section.style.display = 'none';
        }
        // 清空输入
        const nameInput = document.getElementById('newPageNameViewer');
        const urlInput = document.getElementById('pageUrlViewer');
        if (nameInput) nameInput.value = '';
        if (urlInput) urlInput.value = '';
    }

    /**
     * 从 Viewer 创建新页面
     */
    async createPageFromViewer() {
        const newPageNameInput = document.getElementById('newPageNameViewer');
        const pageUrlInput = document.getElementById('pageUrlViewer');
        const pageName = newPageNameInput?.value.trim();

        if (!pageName) {
            this.showToast('error', 'Please enter a PageObject name');
            return;
        }

        // 验证命名（只允许字母、数字、下划线，且必须以字母开头）
        if (!/^[a-zA-Z][a-zA-Z0-9_]*$/.test(pageName)) {
            this.showToast('error', 'PageObject name must start with a letter and contain only letters, numbers, and underscores');
            return;
        }

        try {
            await this.pageObjectManager.createPage(pageName, pageUrlInput?.value.trim() || '');
            await this.refreshPageList();
            await this.refreshViewerPageList();

            // 清空输入并隐藏创建区域
            this.hideCreatePageObjectSection();

            // 选中新创建的页面
            const viewerSelect = document.getElementById('viewerPageSelect');
            if (viewerSelect) {
                viewerSelect.value = pageName;
                await this.onViewerPageSelect({ target: { value: pageName } });
            }

            this.showToast('success', `PageObject "${pageName}" created successfully`);
        } catch (error) {
            this.showToast('error', error.message);
        }
    }

    /**
     * 页面选择变化处理
     */
    onPageSelect(e) {
        // Save Element Modal 中不再需要处理 URL 字段
        // 保留方法以防止调用错误
    }

    /**
     * 保存元素
     */
    async saveElement() {
        const pageSelect = document.getElementById('pageSelect');
        const elementNameInput = document.getElementById('elementName');
        const elementTypeSelect = document.getElementById('elementType');
        const elementDescriptionInput = document.getElementById('elementDescription');

        const pageName = pageSelect.value;
        const elementName = elementNameInput.value.trim();
        const elementType = elementTypeSelect.value;
        const elementDescription = elementDescriptionInput.value.trim();

        // 验证必填字段
        if (!pageName) {
            this.showToast('error', 'Please select or create a PageObject first');
            return;
        }

        if (!elementName) {
            this.showToast('error', 'Element name is required');
            elementNameInput.focus();
            return;
        }

        // 验证元素命名（camelCase）
        if (!/^[a-z][a-zA-Z0-9]*$/.test(elementName)) {
            this.showToast('error', 'Element name must use camelCase and start with a lowercase letter');
            return;
        }

        try {
            // 将定位器转换为 JSON 格式
            const locatorsJSON = this.currentLocators.map(locatorStr => {
                return this.pageObjectManager.parseLocatorToJSON(locatorStr);
            });

            // 添加元素
            await this.pageObjectManager.addElement(pageName, elementName, {
                type: elementType,
                description: elementDescription,
                locators: locatorsJSON
            });

            this.showToast('success', `Element "${elementName}" saved to "${pageName}"`);
            this.hideSaveElementModal();

            // 如果在查看器打开时保存，刷新查看器
            if (this.viewerModal) {
                await this.refreshViewer();
            }
        } catch (error) {
            this.showToast('error', error.message);
        }
    }

    /**
     * 更新定位器预览
     */
    updateLocatorPreview(locators) {
        const previewContainer = document.getElementById('locatorPreview');
        if (!previewContainer) return;

        if (locators.length === 0) {
            previewContainer.innerHTML = '<div class="locator-preview-item">No locators generated</div>';
            return;
        }

        previewContainer.innerHTML = locators.map((locator, index) => `
            <div class="locator-preview-item" data-locator-index="${index}">
                <span class="locator-preview-text">${this.escapeHtml(locator)}</span>
                <button class="locator-preview-delete-btn" data-locator-index="${index}" title="Delete this locator" aria-label="Delete locator">
                    <span aria-hidden="true">✕</span>
                </button>
            </div>
        `).join('');

        // 绑定删除按钮事件
        previewContainer.querySelectorAll('.locator-preview-delete-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                e.stopPropagation();
                const index = parseInt(btn.getAttribute('data-locator-index'), 10);
                this.deleteLocatorFromPreview(index);
            });
        });
    }

    /**
     * 从预览中删除定位器（同步到主列表）
     */
    deleteLocatorFromPreview(index) {
        if (index < 0 || index >= this.currentLocators.length) return;

        // 从当前定位器列表中删除
        this.currentLocators.splice(index, 1);

        // 更新预览
        this.updateLocatorPreview(this.currentLocators);

        // 同步到主界面中的 currentLocators
        if (window.currentLocators && Array.isArray(window.currentLocators)) {
            window.currentLocators.length = 0;
            window.currentLocators.push(...this.currentLocators);
        }

        // 同步更新主界面的定位器列表显示
        const mainLocatorOutput = document.getElementById('locatorOutput');
        const mainLocatorCount = document.getElementById('locatorCount');
        if (mainLocatorOutput && mainLocatorCount && window.renderLocatorList) {
            window.renderLocatorList(this.currentLocators);
            mainLocatorCount.textContent = this.currentLocators.length;
        }

        this.showToast('success', 'Locator deleted');
    }

    /**
     * 推断元素类型
     */
    inferElementType(elementData) {
        const tagName = (elementData.tagName || '').toLowerCase();
        const type = (elementData.type || '').toLowerCase();

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
     * 刷新查看器
     */
    async refreshViewer() {
        const viewerSelect = document.getElementById('viewerPageSelect');
        const pageName = viewerSelect.value;

        if (!pageName) {
            document.getElementById('jsonViewerContent').textContent = '';
            document.getElementById('elementsList').innerHTML = '<div class="empty-state">Select a PageObject to view elements</div>';
            return;
        }

        const pageData = await this.pageObjectManager.getPageObject(pageName);
        if (!pageData) {
            return;
        }

        // 更新 JSON 显示
        const jsonContent = JSON.stringify({ pages: { [pageName]: pageData } }, null, 2);
        document.getElementById('jsonViewerContent').textContent = jsonContent;

        // 更新元素列表（传入 container 信息）
        this.renderElementsList(pageData.elements, pageData.container);
    }

    /**
     * 渲染元素列表
     */
    renderElementsList(elements, containerData) {
        const container = document.getElementById('elementsList');
        if (!container) return;

        let html = '';

        // 显示 Container 信息（如果有）
        if (containerData && containerData.locators && containerData.locators.length > 0) {
            html += `
                <div class="container-section">
                    <div class="container-header">
                        <span class="container-icon" aria-hidden="true">📦</span>
                        <span class="container-title">Container</span>
                        ${containerData.description ? `<span class="container-description">${this.escapeHtml(containerData.description)}</span>` : ''}
                    </div>
                    <div class="container-locators">
                        ${containerData.locators.map((locator, index) => `
                            <div class="container-locator-item">
                                <code>${this.escapeHtml(this.formatLocator(locator))}</code>
                            </div>
                        `).join('')}
                    </div>
                    <div class="container-actions">
                        <button class="btn btn-sm btn-outline" data-action="delete-container">
                            <span aria-hidden="true">🗑️</span> Remove Container
                        </button>
                    </div>
                </div>
            `;
        } else {
            html += `
                <div class="container-section container-empty">
                    <div class="container-header">
                        <span class="container-icon" aria-hidden="true">📦</span>
                        <span class="container-title">Container</span>
                        <span class="container-empty-text">No container set</span>
                    </div>
                </div>
            `;
        }

        // 显示元素列表
        const elementNames = Object.keys(elements);
        if (elementNames.length > 0) {
            html += `<div class="elements-section-title">Elements (${elementNames.length})</div>`;
        }

        if (elementNames.length === 0) {
            html += '<div class="empty-state">No elements in this PageObject</div>';
        } else {
            html += elementNames.map(name => {
                const element = elements[name];
                return `
                    <div class="element-item">
                        <div class="element-info">
                            <div>
                                <span class="element-name">${this.escapeHtml(name)}</span>
                                <span class="element-type">${this.escapeHtml(element.type || 'unknown')}</span>
                            </div>
                            ${element.description ? `<div class="element-description">${this.escapeHtml(element.description)}</div>` : ''}
                        </div>
                        <div class="element-actions">
                            <button class="btn btn-icon-xs" data-action="delete-element" data-element-name="${this.escapeHtml(name)}" title="Delete element">
                                <span aria-hidden="true">🗑️</span>
                            </button>
                        </div>
                    </div>
                `;
            }).join('');
        }

        container.innerHTML = html;
        this.bindElementsListActions(container);
    }

    bindElementsListActions(container) {
        container.querySelector('[data-action="delete-container"]')?.addEventListener('click', () => {
            this.deleteContainer();
        });

        container.querySelectorAll('[data-action="delete-element"]').forEach(button => {
            button.addEventListener('click', () => {
                this.deleteElement(button.dataset.elementName);
            });
        });
    }

    /**
     * 格式化定位器显示
     */
    formatLocator(locator) {
        if (typeof locator === 'string') return locator;
        if (locator.strategy && locator.value) {
            if (locator.options && locator.options.name) {
                return `${locator.strategy}('${locator.value}', name='${locator.options.name}')`;
            }
            return `${locator.strategy}('${locator.value}')`;
        }
        return JSON.stringify(locator);
    }

    /**
     * 删除 Container
     */
    async deleteContainer() {
        const viewerSelect = document.getElementById('viewerPageSelect');
        const pageName = viewerSelect.value;

        if (!pageName) {
            this.showToast('error', 'No PageObject selected');
            return;
        }

        if (!confirm(`Are you sure you want to remove the container from "${pageName}"?`)) {
            return;
        }

        try {
            await this.pageObjectManager.deleteContainer(pageName);
            await this.refreshViewer();
            this.showToast('success', 'Container removed');
        } catch (error) {
            this.showToast('error', error.message);
        }
    }

    /**
     * 查看器页面选择变化
     */
    async onViewerPageSelect(e) {
        await this.refreshViewer();
    }

    /**
     * 导出 JSON
     */
    async exportJson() {
        try {
            const jsonContent = await this.pageObjectManager.exportToJson();

            // 创建下载链接
            const blob = new Blob([jsonContent], { type: 'application/json' });
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = 'pageobjects.json';
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            URL.revokeObjectURL(url);

            this.showToast('success', 'PageObjects exported successfully');
        } catch (error) {
            this.showToast('error', `Export failed: ${error.message}`);
        }
    }

    /**
     * 触发导入 JSON
     */
    triggerImportJson() {
        const fileInput = document.getElementById('jsonFileInput');
        if (fileInput) {
            fileInput.click();
        }
    }

    /**
     * 处理文件导入
     */
    async handleFileImport(e) {
        const file = e.target.files[0];
        if (!file) return;

        try {
            const text = await file.text();
            await this.pageObjectManager.importFromJson(text);

            await this.refreshPageList();
            await this.refreshViewerPageList();
            await this.refreshViewer();

            this.showToast('success', 'PageObjects imported successfully');
        } catch (error) {
            this.showToast('error', `Import failed: ${error.message}`);
        }

        // 清空文件输入
        e.target.value = '';
    }

    /**
     * 复制 JSON
     */
    async copyJson() {
        const jsonContent = document.getElementById('jsonViewerContent').textContent;
        if (!jsonContent) {
            this.showToast('error', 'No JSON content to copy');
            return;
        }

        try {
            await navigator.clipboard.writeText(jsonContent);
            this.showToast('success', 'JSON copied to clipboard');
        } catch (error) {
            this.showToast('error', 'Failed to copy JSON');
        }
    }

    /**
     * 删除元素
     */
    async deleteElement(elementName) {
        const viewerSelect = document.getElementById('viewerPageSelect');
        const pageName = viewerSelect.value;

        if (!pageName) {
            this.showToast('error', 'No PageObject selected');
            return;
        }

        if (!confirm(`Are you sure you want to delete element "${elementName}" from "${pageName}"?`)) {
            return;
        }

        try {
            await this.pageObjectManager.deleteElement(pageName, elementName);
            await this.refreshViewer();
            this.showToast('success', `Element "${elementName}" deleted`);
        } catch (error) {
            this.showToast('error', error.message);
        }
    }

    /**
     * 显示 Toast 通知
     */
    showToast(type, message) {
        const toastContainer = document.getElementById('toastContainer');
        if (!toastContainer) {
            console.log(`[Toast ${type}]`, message);
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

    /**
     * HTML 转义
     */
    escapeHtml(str) {
        if (!str) return '';
        return String(str)
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;')
            .replace(/'/g, '&#39;');
    }

    /**
     * 显示保存 Container 对话框
     */
    async showSaveContainerModal(elementData, locators) {
        this.currentElementData = elementData;
        this.currentContainerLocators = [...locators];

        // 重置表单
        document.getElementById('containerDescription').value = '';

        // 更新定位器预览
        this.updateContainerLocatorPreview(this.currentContainerLocators);

        // 加载页面列表
        await this.refreshContainerPageList();

        // 显示对话框
        this.containerModal = document.getElementById('saveContainerModal');
        if (this.containerModal) {
            this.containerModal.style.display = 'flex';
        } else {
            throw new Error('Save Container Modal element not found');
        }
    }

    /**
     * 隐藏保存 Container 对话框
     */
    hideSaveContainerModal() {
        if (this.containerModal) {
            this.containerModal.style.display = 'none';
            this.containerModal = null;
        }
        this.currentElementData = null;
        this.currentContainerLocators = [];
    }

    /**
     * 刷新 Container 页面列表
     */
    async refreshContainerPageList() {
        const pageSelect = document.getElementById('containerPageSelect');
        if (!pageSelect) return;

        const pages = await this.pageObjectManager.listPages();

        pageSelect.innerHTML = '<option value="">-- Select PageObject --</option>';

        pages.forEach(pageName => {
            const option = document.createElement('option');
            option.value = pageName;
            option.textContent = pageName;
            pageSelect.appendChild(option);
        });
    }

    /**
     * 更新 Container 定位器预览
     */
    updateContainerLocatorPreview(locators) {
        const previewContainer = document.getElementById('containerLocatorPreview');
        if (!previewContainer) return;

        if (locators.length === 0) {
            previewContainer.innerHTML = '<div class="locator-preview-item">No locators generated</div>';
            return;
        }

        previewContainer.innerHTML = locators.map((locator, index) => `
            <div class="locator-preview-item" data-locator-index="${index}">
                <span class="locator-preview-text">${this.escapeHtml(locator)}</span>
                <button class="locator-preview-delete-btn" data-locator-index="${index}" title="Delete this locator" aria-label="Delete locator">
                    <span aria-hidden="true">✕</span>
                </button>
            </div>
        `).join('');

        // 绑定删除按钮事件
        previewContainer.querySelectorAll('.locator-preview-delete-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                e.stopPropagation();
                const index = parseInt(btn.getAttribute('data-locator-index'), 10);
                this.deleteContainerLocator(index);
            });
        });
    }

    /**
     * 删除 Container 定位器
     */
    deleteContainerLocator(index) {
        if (index < 0 || index >= this.currentContainerLocators.length) return;

        this.currentContainerLocators.splice(index, 1);
        this.updateContainerLocatorPreview(this.currentContainerLocators);
        this.showToast('success', 'Locator deleted');
    }

    /**
     * 保存 Container
     */
    async saveContainer() {
        const pageSelect = document.getElementById('containerPageSelect');
        const containerDescriptionInput = document.getElementById('containerDescription');

        const pageName = pageSelect.value;
        const containerDescription = containerDescriptionInput.value.trim();

        // 验证必填字段
        if (!pageName) {
            this.showToast('error', 'Please select a PageObject');
            return;
        }

        if (this.currentContainerLocators.length === 0) {
            this.showToast('error', 'No locators to save');
            return;
        }

        try {
            // 将定位器转换为 JSON 格式
            const locatorsJSON = this.currentContainerLocators.map(locatorStr => {
                return this.pageObjectManager.parseLocatorToJSON(locatorStr);
            });

            // 设置 Container
            await this.pageObjectManager.setContainer(pageName, {
                description: containerDescription,
                locators: locatorsJSON
            });

            this.showToast('success', `Container saved to "${pageName}"`);
            this.hideSaveContainerModal();

            // 如果在查看器打开时保存，刷新查看器
            if (this.viewerModal) {
                await this.refreshViewer();
            }
        } catch (error) {
            this.showToast('error', error.message);
        }
    }
}

// 创建全局实例
window.pageObjectUIManager = new PageObjectUIManager();
