import { app } from "../../scripts/app.js";
import { ComfyWidgets } from "../../scripts/widgets.js";

const PROMPT_NODE_TYPE = "WanVideoWakawavePromptBuilder";
const PRESETS_KEY = "wanvideo_wakawave_prompt_presets";

// Load/save presets
function loadPresets() {
    try {
        const stored = localStorage.getItem(PRESETS_KEY);
        return stored ? JSON.parse(stored) : {};
    } catch (e) {
        console.error("Failed to load presets:", e);
        return {};
    }
}

function savePresets(presets) {
    try {
        localStorage.setItem(PRESETS_KEY, JSON.stringify(presets));
    } catch (e) {
        console.error("Failed to save presets:", e);
    }
}

app.registerExtension({
    name: "WanVideo.WakawavePromptBuilder",

    async beforeRegisterNodeDef(nodeType, nodeData, app) {
        if (nodeData.name !== PROMPT_NODE_TYPE) return;

        console.log("WanVideo Wakawave Prompt Builder: Registering node");

        const onNodeCreated = nodeType.prototype.onNodeCreated;
        nodeType.prototype.onNodeCreated = function() {
            const result = onNodeCreated?.apply(this, arguments);
            const node = this;

            // Create POSITIVE prompt section
            const positiveLabel = this.addWidget("text", "━━━━ POSITIVE ━━━━", "", () => {});
            positiveLabel.serialize = false;
            positiveLabel.computeSize = () => [this.size[0] - 20, 20];

            const positiveWidget = ComfyWidgets.STRING(this, "positive_prompts", ["STRING", {
                multiline: true,
                default: ""
            }], app);
            node.positiveWidget = positiveWidget.widget;
            node.positiveWidget.serialize = false; // Don't serialize the text widget
            node.positiveWidget.computeSize = (width) => [width, Math.max(100, node.positiveWidget.inputEl?.scrollHeight || 100)];

            // Create positive_bundle widget (hidden, sends data to Python)
            const positiveBundleWidget = this.addWidget("text", "positive_bundle", "[]", () => {});
            positiveBundleWidget.serialize = true;
            positiveBundleWidget.computeSize = () => [0, -4]; // Hide from display
            node.positiveBundleWidget = positiveBundleWidget;

            // Create NEGATIVE prompt section
            const negativeLabel = this.addWidget("text", "━━━━ NEGATIVE ━━━━", "", () => {});
            negativeLabel.serialize = false;
            negativeLabel.computeSize = () => [this.size[0] - 20, 20];

            const negativeWidget = ComfyWidgets.STRING(this, "negative_prompts", ["STRING", {
                multiline: true,
                default: ""
            }], app);
            node.negativeWidget = negativeWidget.widget;
            node.negativeWidget.serialize = false; // Don't serialize the text widget
            node.negativeWidget.computeSize = (width) => [width, Math.max(100, node.negativeWidget.inputEl?.scrollHeight || 100)];

            // Create negative_bundle widget (hidden, sends data to Python)
            const negativeBundleWidget = this.addWidget("text", "negative_bundle", "[]", () => {});
            negativeBundleWidget.serialize = true;
            negativeBundleWidget.computeSize = () => [0, -4]; // Hide from display
            node.negativeBundleWidget = negativeBundleWidget;

            // Add Line button
            const addBtn = this.addWidget("button", "+ Add Line", null, () => {
                // Add line to whichever text box has focus, or positive by default
                const activeWidget = document.activeElement === node.negativeWidget.inputEl ? node.negativeWidget : node.positiveWidget;
                const current = activeWidget.value;
                activeWidget.value = current + (current && !current.endsWith("\n") ? "\n\n" : "\n");
                node.updateBundles();
            });
            addBtn.serialize = false;

            // Save Preset button
            const saveBtn = this.addWidget("button", "💾 Save", null, () => {
                const name = prompt("Enter preset name:");
                if (!name) return;

                const presets = loadPresets();
                presets[name] = {
                    positive: node.positiveWidget.value,
                    negative: node.negativeWidget.value
                };
                savePresets(presets);
                alert(`Preset "${name}" saved!`);
            });
            saveBtn.serialize = false;

            // Load Preset button
            const loadBtn = this.addWidget("button", "📂 Load", null, () => {
                const presets = loadPresets();
                const names = Object.keys(presets);

                if (names.length === 0) {
                    alert("No presets saved yet!");
                    return;
                }

                const list = names.map((n, i) => `${i + 1}. ${n}`).join("\n");
                const choice = prompt(`Choose preset (enter name or number):\n\n${list}`);

                if (!choice) return;

                // Try exact match first, then number
                let selectedName = choice;
                if (!presets[choice]) {
                    const num = parseInt(choice);
                    if (!isNaN(num) && num > 0 && num <= names.length) {
                        selectedName = names[num - 1];
                    }
                }

                if (presets[selectedName]) {
                    const preset = presets[selectedName];
                    // Handle both old single-prompt presets and new dual-prompt presets
                    if (typeof preset === 'string') {
                        node.positiveWidget.value = preset;
                        node.negativeWidget.value = "";
                    } else {
                        node.positiveWidget.value = preset.positive || "";
                        node.negativeWidget.value = preset.negative || "";
                    }
                    node.updateBundles();
                    alert(`Preset "${selectedName}" loaded!`);
                } else {
                    alert("Preset not found!");
                }
            });
            loadBtn.serialize = false;

            // Delete Preset button
            const deleteBtn = this.addWidget("button", "🗑 Delete", null, () => {
                const presets = loadPresets();
                const names = Object.keys(presets);

                if (names.length === 0) {
                    alert("No presets to delete!");
                    return;
                }

                const list = names.map((n, i) => `${i + 1}. ${n}`).join("\n");
                const choice = prompt(`Delete preset (enter name or number):\n\n${list}`);

                if (!choice) return;

                let selectedName = choice;
                if (!presets[choice]) {
                    const num = parseInt(choice);
                    if (!isNaN(num) && num > 0 && num <= names.length) {
                        selectedName = names[num - 1];
                    }
                }

                if (presets[selectedName]) {
                    delete presets[selectedName];
                    savePresets(presets);
                    alert(`Preset "${selectedName}" deleted!`);
                } else {
                    alert("Preset not found!");
                }
            });
            deleteBtn.serialize = false;

            // Update bundles when prompts change
            node.updateBundles = function() {
                // Parse positive prompts
                const positiveText = node.positiveWidget.value;
                const positiveLines = positiveText.split('\n').filter(l => l.trim());
                const positivePrompts = positiveLines.map(line => {
                    const weightMatch = line.match(/,\s*weight:\s*([\d.]+)\s*$/i);
                    let text = line;
                    let weight = 1.0;

                    if (weightMatch) {
                        weight = parseFloat(weightMatch[1]) || 1.0;
                        text = line.substring(0, weightMatch.index).trim();
                    }

                    return {
                        text: text,
                        weight: weight,
                        enabled: true
                    };
                });

                // Parse negative prompts
                const negativeText = node.negativeWidget.value;
                const negativeLines = negativeText.split('\n').filter(l => l.trim());
                const negativePrompts = negativeLines.map(line => {
                    const weightMatch = line.match(/,\s*weight:\s*([\d.]+)\s*$/i);
                    let text = line;
                    let weight = 1.0;

                    if (weightMatch) {
                        weight = parseFloat(weightMatch[1]) || 1.0;
                        text = line.substring(0, weightMatch.index).trim();
                    }

                    return {
                        text: text,
                        weight: weight,
                        enabled: true
                    };
                });

                console.log("[Wakawave Prompt] Positive prompts:", positivePrompts);
                console.log("[Wakawave Prompt] Negative prompts:", negativePrompts);

                // Update bundle widgets
                node.positiveBundleWidget.value = JSON.stringify(positivePrompts);
                node.negativeBundleWidget.value = JSON.stringify(negativePrompts);
                console.log("[Wakawave Prompt] Bundles updated successfully");
            };

            // Watch for changes in both text widgets
            const originalPositiveCallback = node.positiveWidget.callback;
            node.positiveWidget.callback = function(value) {
                if (originalPositiveCallback) {
                    originalPositiveCallback.apply(this, arguments);
                }
                node.updateBundles();
            };

            const originalNegativeCallback = node.negativeWidget.callback;
            node.negativeWidget.callback = function(value) {
                if (originalNegativeCallback) {
                    originalNegativeCallback.apply(this, arguments);
                }
                node.updateBundles();
            };

            // Initial bundle update
            setTimeout(() => node.updateBundles(), 100);

            return result;
        };
    }
});

console.log("WanVideo Wakawave Prompt Builder extension loaded");
