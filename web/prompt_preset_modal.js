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
    show(presets, onLoad, onSave) {
        this.presets = presets;
        this.onLoadCallback = onLoad;
        this.onSaveCallback = onSave;
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
                <div class="search-actions">
                    <button class="btn-icon" data-action="import" title="Import presets from file">📥</button>
                    <button class="btn-icon" data-action="export" title="Export all presets to file">📤</button>
                </div>
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
                    <button class="btn-secondary btn-small" data-action="export-selected" disabled title="Export this preset">📤</button>
                    <button class="btn-secondary" data-action="rename" disabled>✏️ Rename</button>
                    <button class="btn-secondary" data-action="duplicate" disabled>📋 Duplicate</button>
                    <button class="btn-danger" data-action="delete" disabled>🗑️ Delete</button>
                    <div class="load-dropdown" data-disabled="true">
                        <button class="btn-primary dropdown-toggle" data-action="load" disabled>
                            ✅ Load <span class="arrow">▼</span>
                        </button>
                        <div class="dropdown-menu">
                            <button data-action="load-both">Load Both</button>
                            <button data-action="load-positive">Load Positive Only</button>
                            <button data-action="load-negative">Load Negative Only</button>
                            <div class="dropdown-divider"></div>
                            <button data-action="append-positive">Append to Positive</button>
                            <button data-action="append-negative">Append to Negative</button>
                        </div>
                    </div>
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

        // Import/Export buttons
        modal.querySelector('[data-action="import"]').addEventListener('click', () => this.importPresets());
        modal.querySelector('[data-action="export"]').addEventListener('click', () => this.exportAllPresets());
        modal.querySelector('[data-action="export-selected"]').addEventListener('click', () => this.exportSelectedPreset());

        // Action buttons
        modal.querySelector('[data-action="rename"]').addEventListener('click', () => this.renamePreset());
        modal.querySelector('[data-action="duplicate"]').addEventListener('click', () => this.duplicatePreset());
        modal.querySelector('[data-action="delete"]').addEventListener('click', () => this.deletePreset());

        // Load dropdown
        this.setupLoadDropdown();

        // Keyboard shortcuts
        document.addEventListener('keydown', this.handleKeydown.bind(this));
    }

    /**
     * Setup load dropdown with different load modes
     */
    setupLoadDropdown() {
        const dropdown = this.modal.querySelector('.load-dropdown');
        const toggleBtn = dropdown.querySelector('.dropdown-toggle');
        const menu = dropdown.querySelector('.dropdown-menu');

        // Toggle dropdown
        toggleBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            if (dropdown.dataset.disabled === 'true') return;

            const isOpen = dropdown.classList.contains('open');
            dropdown.classList.toggle('open', !isOpen);
        });

        // Close dropdown when clicking outside
        document.addEventListener('click', () => {
            dropdown.classList.remove('open');
        });

        // Load mode buttons
        menu.querySelector('[data-action="load-both"]').addEventListener('click', () => this.loadPreset('both'));
        menu.querySelector('[data-action="load-positive"]').addEventListener('click', () => this.loadPreset('positive'));
        menu.querySelector('[data-action="load-negative"]').addEventListener('click', () => this.loadPreset('negative'));
        menu.querySelector('[data-action="append-positive"]').addEventListener('click', () => this.loadPreset('append-positive'));
        menu.querySelector('[data-action="append-negative"]').addEventListener('click', () => this.loadPreset('append-negative'));
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
        const hasSelection = !!this.selectedPreset;

        // Update regular buttons
        const buttons = this.modal.querySelectorAll('.footer-actions button:not(.dropdown-toggle):not([data-action^="load-"]):not([data-action^="append-"])');
        buttons.forEach(btn => {
            btn.disabled = !hasSelection;
        });

        // Update load dropdown
        const dropdown = this.modal.querySelector('.load-dropdown');
        const dropdownToggle = dropdown.querySelector('.dropdown-toggle');
        dropdownToggle.disabled = !hasSelection;
        dropdown.dataset.disabled = hasSelection ? 'false' : 'true';

        const selectedName = this.modal.querySelector('.selected-name');
        selectedName.textContent = hasSelection ? this.selectedPreset : '';
    }

    /**
     * Load the selected preset
     * @param {string} mode - 'both', 'positive', 'negative', 'append-positive', 'append-negative'
     */
    loadPreset(mode = 'both') {
        if (!this.selectedPreset) return;

        const preset = this.presets[this.selectedPreset];

        // Update usage count
        if (typeof preset === 'object') {
            preset.usageCount = (preset.usageCount || 0) + 1;
            preset.modified = new Date().toISOString();
        }

        if (this.onLoadCallback) {
            this.onLoadCallback(this.selectedPreset, preset, mode);
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

        // Save changes to localStorage
        if (this.onSaveCallback) {
            this.onSaveCallback();
        }

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

        // Save changes to localStorage
        if (this.onSaveCallback) {
            this.onSaveCallback();
        }

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

        // Save changes to localStorage
        if (this.onSaveCallback) {
            this.onSaveCallback();
        }

        this.renderPresetList();
        this.updatePreview();
        this.updateActionButtons();
    }

    /**
     * Import presets from a JSON file
     */
    importPresets() {
        const input = document.createElement('input');
        input.type = 'file';
        input.accept = '.json';

        input.onchange = (e) => {
            const file = e.target.files[0];
            if (!file) return;

            const reader = new FileReader();
            reader.onload = (event) => {
                try {
                    const imported = JSON.parse(event.target.result);

                    // Validate format
                    if (typeof imported !== 'object') {
                        alert('Invalid preset file format!');
                        return;
                    }

                    // Ask merge or replace
                    const mode = confirm(
                        `Import ${Object.keys(imported).length} preset(s)?\n\n` +
                        'Click OK to MERGE with existing presets.\n' +
                        'Click Cancel to REPLACE all presets.'
                    );

                    if (mode) {
                        // Merge - ask about conflicts
                        const conflicts = Object.keys(imported).filter(name => this.presets[name]);
                        if (conflicts.length > 0) {
                            const overwrite = confirm(
                                `${conflicts.length} preset(s) already exist:\n${conflicts.join(', ')}\n\n` +
                                'Click OK to overwrite them.\n' +
                                'Click Cancel to skip them.'
                            );

                            if (overwrite) {
                                Object.assign(this.presets, imported);
                            } else {
                                // Only add new ones
                                Object.keys(imported).forEach(name => {
                                    if (!this.presets[name]) {
                                        this.presets[name] = imported[name];
                                    }
                                });
                            }
                        } else {
                            Object.assign(this.presets, imported);
                        }
                    } else {
                        // Replace all
                        this.presets = imported;
                    }

                    // Save changes to localStorage
                    if (this.onSaveCallback) {
                        this.onSaveCallback();
                    }

                    this.renderPresetList();
                    this.updatePreview();
                    alert(`Successfully imported ${Object.keys(imported).length} preset(s)!`);
                } catch (error) {
                    alert('Failed to import presets: ' + error.message);
                }
            };

            reader.readAsText(file);
        };

        input.click();
    }

    /**
     * Export all presets to a JSON file
     */
    exportAllPresets() {
        if (Object.keys(this.presets).length === 0) {
            alert('No presets to export!');
            return;
        }

        const filename = `wakawave_prompts_${new Date().toISOString().split('T')[0]}.json`;
        this.downloadJSON(this.presets, filename);
        alert(`Exported ${Object.keys(this.presets).length} preset(s)!`);
    }

    /**
     * Export the selected preset to a JSON file
     */
    exportSelectedPreset() {
        if (!this.selectedPreset) return;

        const preset = this.presets[this.selectedPreset];
        const data = { [this.selectedPreset]: preset };
        const filename = `wakawave_prompt_${this.selectedPreset.replace(/[^a-zA-Z0-9]/g, '_')}.json`;

        this.downloadJSON(data, filename);
    }

    /**
     * Download data as JSON file
     */
    downloadJSON(data, filename) {
        const json = JSON.stringify(data, null, 2);
        const blob = new Blob([json], { type: 'application/json' });
        const url = URL.createObjectURL(blob);

        const a = document.createElement('a');
        a.href = url;
        a.download = filename;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
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
