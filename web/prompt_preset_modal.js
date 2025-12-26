/**
 * Visual Preset Browser for Wakawave Prompt Builder
 * Modern modal dialog for managing prompt presets
 */

export class PresetModal {
    constructor() {
        this.modal = null;
        this.selectedPreset = null;
        this.presets = {};
        this.onLoadCallback = null;
        this.searchTerm = "";
    }

    /**
     * Show the preset browser modal
     */
    show(presets, onLoad) {
        this.presets = presets;
        this.onLoadCallback = onLoad;
        this.selectedPreset = null;
        this.searchTerm = "";

        this.createModal();
        this.renderPresetList();
        this.updatePreview();
    }

    /**
     * Create the modal HTML structure
     */
    createModal() {
        // Remove existing modal if any
        if (this.modal) {
            this.modal.remove();
        }

        // Create modal overlay
        const overlay = document.createElement('div');
        overlay.className = 'wakawave-preset-modal-overlay';
        overlay.addEventListener('click', (e) => {
            if (e.target === overlay) this.close();
        });

        // Create modal container
        const modal = document.createElement('div');
        modal.className = 'wakawave-preset-modal';

        modal.innerHTML = `
            <div class="preset-modal-header">
                <h2>📂 Load Preset</h2>
                <button class="close-btn" title="Close">✕</button>
            </div>

            <div class="preset-modal-search">
                <input type="text" placeholder="🔍 Search presets..." class="search-input">
                <span class="preset-count">0 presets</span>
            </div>

            <div class="preset-modal-content">
                <div class="preset-list-container">
                    <div class="preset-list">
                        <!-- Preset items will be inserted here -->
                    </div>
                </div>

                <div class="preset-preview-container">
                    <div class="preset-preview">
                        <div class="preview-empty">
                            Select a preset to preview
                        </div>
                    </div>
                </div>
            </div>

            <div class="preset-modal-footer">
                <div class="footer-info">
                    <span class="selected-name"></span>
                </div>
                <div class="footer-actions">
                    <button class="btn-secondary" data-action="rename" disabled>✏️ Rename</button>
                    <button class="btn-secondary" data-action="duplicate" disabled>📋 Duplicate</button>
                    <button class="btn-danger" data-action="delete" disabled>🗑️ Delete</button>
                    <button class="btn-primary" data-action="load" disabled>✅ Load</button>
                </div>
            </div>
        `;

        overlay.appendChild(modal);
        document.body.appendChild(overlay);
        this.modal = overlay;

        // Attach event listeners
        this.attachEventListeners();
    }

    /**
     * Attach event listeners to modal elements
     */
    attachEventListeners() {
        const modal = this.modal.querySelector('.wakawave-preset-modal');

        // Close button
        modal.querySelector('.close-btn').addEventListener('click', () => this.close());

        // Search input
        const searchInput = modal.querySelector('.search-input');
        searchInput.addEventListener('input', (e) => {
            this.searchTerm = e.target.value.toLowerCase();
            this.renderPresetList();
        });

        // Action buttons
        modal.querySelector('[data-action="load"]').addEventListener('click', () => this.loadPreset());
        modal.querySelector('[data-action="rename"]').addEventListener('click', () => this.renamePreset());
        modal.querySelector('[data-action="duplicate"]').addEventListener('click', () => this.duplicatePreset());
        modal.querySelector('[data-action="delete"]').addEventListener('click', () => this.deletePreset());

        // Keyboard shortcuts
        document.addEventListener('keydown', this.handleKeydown.bind(this));
    }

    /**
     * Handle keyboard shortcuts
     */
    handleKeydown(e) {
        if (!this.modal) return;

        if (e.key === 'Escape') {
            this.close();
        } else if (e.key === 'Enter' && this.selectedPreset) {
            this.loadPreset();
        } else if (e.key === 'Delete' && this.selectedPreset) {
            this.deletePreset();
        }
    }

    /**
     * Render the list of presets
     */
    renderPresetList() {
        const listContainer = this.modal.querySelector('.preset-list');
        const presetNames = Object.keys(this.presets);

        // Filter by search term
        const filteredNames = presetNames.filter(name =>
            name.toLowerCase().includes(this.searchTerm)
        );

        // Sort alphabetically
        filteredNames.sort((a, b) => a.localeCompare(b));

        // Update count
        this.modal.querySelector('.preset-count').textContent = `${filteredNames.length} preset${filteredNames.length !== 1 ? 's' : ''}`;

        // Clear list
        listContainer.innerHTML = '';

        if (filteredNames.length === 0) {
            listContainer.innerHTML = `
                <div class="preset-empty">
                    ${this.searchTerm ? 'No presets found matching your search' : 'No presets saved yet'}
                </div>
            `;
            return;
        }

        // Create preset items
        filteredNames.forEach(name => {
            const preset = this.presets[name];
            const item = document.createElement('div');
            item.className = 'preset-item';
            item.dataset.name = name;

            // Get preview text
            const positivePreview = this.getPresetPreview(preset);
            const created = preset.created ? new Date(preset.created).toLocaleDateString() : 'Unknown';
            const usageCount = preset.usageCount || 0;

            item.innerHTML = `
                <div class="preset-item-header">
                    <span class="preset-name">${this.escapeHtml(name)}</span>
                    ${preset.favorite ? '<span class="preset-star">★</span>' : ''}
                </div>
                <div class="preset-item-info">
                    <span class="preset-date">📅 ${created}</span>
                    <span class="preset-usage">🔄 ${usageCount}x</span>
                </div>
                <div class="preset-item-preview">${positivePreview}</div>
            `;

            item.addEventListener('click', () => this.selectPreset(name));
            item.addEventListener('dblclick', () => this.loadPreset());

            listContainer.appendChild(item);
        });
    }

    /**
     * Get preview text for a preset
     */
    getPresetPreview(preset) {
        const positive = typeof preset === 'string' ? preset : (preset.positive || '');
        const preview = positive.substring(0, 60);
        return preview ? this.escapeHtml(preview) + (positive.length > 60 ? '...' : '') : '<em>Empty</em>';
    }

    /**
     * Select a preset
     */
    selectPreset(name) {
        // Deselect previous
        this.modal.querySelectorAll('.preset-item').forEach(item => {
            item.classList.remove('selected');
        });

        // Select new
        const item = this.modal.querySelector(`[data-name="${name}"]`);
        if (item) {
            item.classList.add('selected');
            this.selectedPreset = name;
            this.updatePreview();
            this.updateActionButtons();
        }
    }

    /**
     * Update the preview panel
     */
    updatePreview() {
        const previewContainer = this.modal.querySelector('.preset-preview');

        if (!this.selectedPreset) {
            previewContainer.innerHTML = `
                <div class="preview-empty">
                    Select a preset to preview
                </div>
            `;
            return;
        }

        const preset = this.presets[this.selectedPreset];
        const positive = typeof preset === 'string' ? preset : (preset.positive || '');
        const negative = typeof preset === 'string' ? '' : (preset.negative || '');
        const created = preset.created ? new Date(preset.created).toLocaleDateString() : 'Unknown';
        const modified = preset.modified ? new Date(preset.modified).toLocaleDateString() : created;
        const usageCount = preset.usageCount || 0;
        const description = preset.description || '';
        const tags = preset.tags || [];

        previewContainer.innerHTML = `
            <div class="preview-header">
                <h3>${this.escapeHtml(this.selectedPreset)}</h3>
            </div>

            ${description ? `<div class="preview-description">${this.escapeHtml(description)}</div>` : ''}

            ${tags.length > 0 ? `
                <div class="preview-tags">
                    ${tags.map(tag => `<span class="tag">${this.escapeHtml(tag)}</span>`).join('')}
                </div>
            ` : ''}

            <div class="preview-section">
                <div class="preview-label">Positive Prompts:</div>
                <div class="preview-text">${positive ? this.escapeHtml(positive) : '<em>None</em>'}</div>
            </div>

            <div class="preview-section">
                <div class="preview-label">Negative Prompts:</div>
                <div class="preview-text">${negative ? this.escapeHtml(negative) : '<em>None</em>'}</div>
            </div>

            <div class="preview-metadata">
                <div>📅 Created: ${created}</div>
                <div>✏️ Modified: ${modified}</div>
                <div>🔄 Used: ${usageCount} time${usageCount !== 1 ? 's' : ''}</div>
            </div>
        `;
    }

    /**
     * Update action button states
     */
    updateActionButtons() {
        const buttons = this.modal.querySelectorAll('.footer-actions button');
        const hasSelection = !!this.selectedPreset;

        buttons.forEach(btn => {
            btn.disabled = !hasSelection;
        });

        const selectedName = this.modal.querySelector('.selected-name');
        selectedName.textContent = hasSelection ? this.selectedPreset : '';
    }

    /**
     * Load the selected preset
     */
    loadPreset() {
        if (!this.selectedPreset) return;

        const preset = this.presets[this.selectedPreset];

        // Update usage count
        if (typeof preset === 'object') {
            preset.usageCount = (preset.usageCount || 0) + 1;
            preset.modified = new Date().toISOString();
        }

        if (this.onLoadCallback) {
            this.onLoadCallback(this.selectedPreset, preset);
        }

        this.close();
    }

    /**
     * Rename the selected preset
     */
    renamePreset() {
        if (!this.selectedPreset) return;

        const newName = prompt('Enter new name:', this.selectedPreset);
        if (!newName || newName === this.selectedPreset) return;

        if (this.presets[newName]) {
            alert('A preset with that name already exists!');
            return;
        }

        // Rename
        this.presets[newName] = this.presets[this.selectedPreset];
        if (typeof this.presets[newName] === 'object') {
            this.presets[newName].modified = new Date().toISOString();
        }
        delete this.presets[this.selectedPreset];

        this.selectedPreset = newName;
        this.renderPresetList();
        this.selectPreset(newName);
    }

    /**
     * Duplicate the selected preset
     */
    duplicatePreset() {
        if (!this.selectedPreset) return;

        let newName = this.selectedPreset + ' (Copy)';
        let counter = 1;

        while (this.presets[newName]) {
            counter++;
            newName = this.selectedPreset + ` (Copy ${counter})`;
        }

        // Deep copy
        const original = this.presets[this.selectedPreset];
        this.presets[newName] = typeof original === 'string'
            ? original
            : {
                ...original,
                created: new Date().toISOString(),
                modified: new Date().toISOString(),
                usageCount: 0
            };

        this.renderPresetList();
        this.selectPreset(newName);
    }

    /**
     * Delete the selected preset
     */
    deletePreset() {
        if (!this.selectedPreset) return;

        if (!confirm(`Delete preset "${this.selectedPreset}"?\n\nThis cannot be undone.`)) {
            return;
        }

        delete this.presets[this.selectedPreset];
        this.selectedPreset = null;

        this.renderPresetList();
        this.updatePreview();
        this.updateActionButtons();
    }

    /**
     * Close the modal
     */
    close() {
        if (this.modal) {
            document.removeEventListener('keydown', this.handleKeydown);
            this.modal.remove();
            this.modal = null;
        }
    }

    /**
     * Escape HTML to prevent XSS
     */
    escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }
}
