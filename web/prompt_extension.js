import { app } from "../../scripts/app.js";
import { ComfyWidgets } from "../../scripts/widgets.js";
import { PresetModal } from "./prompt_preset_modal.js";

const PROMPT_NODE_TYPE = "WanVideoWakawavePromptBuilder";
const PRESETS_KEY = "wanvideo_wakawave_prompt_presets";

// Load CSS
const link = document.createElement("link");
link.rel = "stylesheet";
link.href = new URL("./prompt_preset_modal.css", import.meta.url).href;
document.head.appendChild(link);

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

            // Create POSITIVE prompt text box
            const positiveWidget = ComfyWidgets.STRING(this, "positive_prompts", ["STRING", {
                multiline: true,
                default: ""
            }], app);
            node.positiveWidget = positiveWidget.widget;
            node.positiveWidget.serialize = false; // Don't serialize the text widget
            // Remove computeSize override to allow vertical resizing with node

            // Create NEGATIVE prompt text box
            const negativeWidget = ComfyWidgets.STRING(this, "negative_prompts", ["STRING", {
                multiline: true,
                default: ""
            }], app);
            node.negativeWidget = negativeWidget.widget;
            node.negativeWidget.serialize = false; // Don't serialize the text widget
            // Remove computeSize override to allow vertical resizing with node

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
                const now = new Date().toISOString();

                // Check if updating existing preset
                const isUpdate = !!presets[name];

                // Store with enhanced metadata
                presets[name] = {
                    positive: node.positiveWidget.value,
                    negative: node.negativeWidget.value,
                    created: isUpdate ? (presets[name].created || now) : now,
                    modified: now,
                    usageCount: isUpdate ? (presets[name].usageCount || 0) : 0,
                    description: presets[name]?.description || "",
                    tags: presets[name]?.tags || [],
                    favorite: presets[name]?.favorite || false
                };

                savePresets(presets);
                alert(`Preset "${name}" ${isUpdate ? 'updated' : 'saved'}!`);
            });
            saveBtn.serialize = false;

            // Load Preset button - Use visual modal
            const loadBtn = this.addWidget("button", "📂 Load", null, () => {
                const presets = loadPresets();

                if (Object.keys(presets).length === 0) {
                    alert("No presets saved yet!");
                    return;
                }

                // Create and show modal
                const modal = new PresetModal();
                modal.show(presets, (name, preset, mode = 'both') => {
                    // Get positive and negative values from preset
                    let positive = "";
                    let negative = "";

                    if (typeof preset === 'string') {
                        // Old format - single string is positive
                        positive = preset;
                        negative = "";
                    } else {
                        positive = preset.positive || "";
                        negative = preset.negative || "";
                    }

                    // Apply based on load mode
                    switch (mode) {
                        case 'both':
                            node.positiveWidget.value = positive;
                            node.negativeWidget.value = negative;
                            break;

                        case 'positive':
                            node.positiveWidget.value = positive;
                            // Keep existing negative
                            break;

                        case 'negative':
                            // Keep existing positive
                            node.negativeWidget.value = negative;
                            break;

                        case 'append-positive':
                            const currentPos = node.positiveWidget.value;
                            node.positiveWidget.value = currentPos + (currentPos ? '\n\n' : '') + positive;
                            break;

                        case 'append-negative':
                            const currentNeg = node.negativeWidget.value;
                            node.negativeWidget.value = currentNeg + (currentNeg ? '\n\n' : '') + negative;
                            break;
                    }

                    node.updateBundles();

                    // Save updated presets (with updated usage count)
                    savePresets(presets);
                }, () => {
                    // Save callback for modal operations (rename, duplicate, delete)
                    savePresets(presets);
                });
            });
            loadBtn.serialize = false;

            // Manage Preset button - Opens modal for preset management
            const deleteBtn = this.addWidget("button", "🗑 Manage", null, () => {
                const presets = loadPresets();

                if (Object.keys(presets).length === 0) {
                    alert("No presets to manage!");
                    return;
                }

                // Open modal (same as load with all modes available)
                const modal = new PresetModal();
                modal.show(presets, (name, preset, mode = 'both') => {
                    // Same load logic as Load button
                    let positive = "";
                    let negative = "";

                    if (typeof preset === 'string') {
                        positive = preset;
                        negative = "";
                    } else {
                        positive = preset.positive || "";
                        negative = preset.negative || "";
                    }

                    switch (mode) {
                        case 'both':
                            node.positiveWidget.value = positive;
                            node.negativeWidget.value = negative;
                            break;
                        case 'positive':
                            node.positiveWidget.value = positive;
                            break;
                        case 'negative':
                            node.negativeWidget.value = negative;
                            break;
                        case 'append-positive':
                            const currentPos = node.positiveWidget.value;
                            node.positiveWidget.value = currentPos + (currentPos ? '\n\n' : '') + positive;
                            break;
                        case 'append-negative':
                            const currentNeg = node.negativeWidget.value;
                            node.negativeWidget.value = currentNeg + (currentNeg ? '\n\n' : '') + negative;
                            break;
                    }

                    node.updateBundles();
                    savePresets(presets);
                }, () => {
                    // Save callback for modal operations (rename, duplicate, delete)
                    savePresets(presets);
                });
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

            // Create hidden bundle widgets at the END (after all visible widgets)
            // Use same hiding approach as LoRA loader
            const positiveBundleWidget = this.addWidget("text", "positive_bundle", "[]", () => {});
            positiveBundleWidget.type = "text";
            positiveBundleWidget.hidden = true;
            positiveBundleWidget.draw = () => {};
            positiveBundleWidget.computeSize = () => [0, -4];
            positiveBundleWidget.serialize = true;
            node.positiveBundleWidget = positiveBundleWidget;

            const negativeBundleWidget = this.addWidget("text", "negative_bundle", "[]", () => {});
            negativeBundleWidget.type = "text";
            negativeBundleWidget.hidden = true;
            negativeBundleWidget.draw = () => {};
            negativeBundleWidget.computeSize = () => [0, -4];
            negativeBundleWidget.serialize = true;
            node.negativeBundleWidget = negativeBundleWidget;

            // Initial bundle update
            setTimeout(() => node.updateBundles(), 100);

            return result;
        };
    }
});

console.log("WanVideo Wakawave Prompt Builder extension loaded");
