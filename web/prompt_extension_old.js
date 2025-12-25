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

            // Create main prompt editor widget - DON'T serialize it (use prompt_bundle instead)
            const promptWidget = ComfyWidgets.STRING(this, "prompts", ["STRING", {
                multiline: true,
                default: ""
            }], app);

            node.promptWidget = promptWidget.widget;
            // CRITICAL: Don't serialize the prompts widget to avoid widget index conflicts
            node.promptWidget.serialize = false;

            // Create the prompt_bundle widget manually (hidden inputs don't auto-create widgets)
            const bundleWidget = this.addWidget("text", "prompt_bundle", "[]", () => {});
            bundleWidget.serialize = true;  // This one DOES serialize (sends data to Python)
            bundleWidget.computeSize = () => [0, -4]; // Hide from UI display
            node.bundleWidget = bundleWidget;

            // Create button row
            const buttonContainer = document.createElement("div");
            buttonContainer.style.cssText = "display: flex; gap: 4px; padding: 4px; flex-wrap: wrap;";

            // Add Prompt Line button - adds a new line for typing more prompts
            const addBtn = this.addWidget("button", "+ Add Line", null, () => {
                const current = node.promptWidget.value;
                // Always add a newline (if text exists, add blank line between)
                node.promptWidget.value = current + (current && !current.endsWith("\n") ? "\n\n" : "\n");
                node.updateBundle();
            });
            addBtn.serialize = false;

            // Save Preset button
            const saveBtn = this.addWidget("button", "💾 Save", null, () => {
                const name = prompt("Enter preset name:");
                if (!name) return;

                const presets = loadPresets();
                presets[name] = node.promptWidget.value;
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
                const choice = prompt(`Choose preset (enter name):\n\n${list}`);

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
                    node.promptWidget.value = presets[selectedName];
                    node.updateBundle();
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
                const choice = prompt(`Delete preset (enter name):\n\n${list}`);

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

            // Update bundle when prompt changes
            node.updateBundle = function() {
                const text = node.promptWidget.value;
                const lines = text.split('\n').filter(l => l.trim());

                const prompts = lines.map(line => {
                    // Parse format: "text, weight: 1.2" or just "text"
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

                console.log("[Wakawave Prompt] Parsed prompts:", prompts);
                console.log("[Wakawave Prompt] Available widgets:", node.widgets?.map(w => w.name));

                // Find the hidden prompt_bundle widget and update it
                const bundleWidget = node.widgets?.find(w => w.name === "prompt_bundle");
                if (bundleWidget) {
                    bundleWidget.value = JSON.stringify(prompts);
                    console.log("[Wakawave Prompt] Bundle updated successfully");
                } else {
                    console.warn("[Wakawave Prompt] prompt_bundle widget not found!");
                }
            };

            // Watch for changes
            const originalCallback = node.promptWidget.callback;
            node.promptWidget.callback = function(value) {
                if (originalCallback) {
                    originalCallback.apply(this, arguments);
                }
                node.updateBundle();
            };

            // Initial bundle update - wait for widgets to be fully initialized
            setTimeout(() => {
                if (node.promptWidget && node.bundleWidget) {
                    node.updateBundle();
                    console.log("[Wakawave Prompt] Initial bundle update complete");
                }
            }, 100);

            return result;
        };

        // CRITICAL: Handle workflow loading/deserialization
        const onConfigure = nodeType.prototype.onConfigure;
        nodeType.prototype.onConfigure = function(info) {
            if (onConfigure) {
                onConfigure.apply(this, arguments);
            }

            const node = this;

            console.log("[Wakawave Prompt] onConfigure called, info:", info);
            console.log("[Wakawave Prompt] widgets_values:", info.widgets_values);

            // Use setTimeout to ensure widgets are created before we try to access them
            setTimeout(() => {
                // Find the prompt_bundle value from saved workflow
                // It should be at the last position in widgets_values array
                if (info.widgets_values && Array.isArray(info.widgets_values)) {
                    const bundleValue = info.widgets_values[info.widgets_values.length - 1];

                    if (bundleValue && typeof bundleValue === 'string' && bundleValue.startsWith('[')) {
                        try {
                            const prompts = JSON.parse(bundleValue);
                            console.log("[Wakawave Prompt] Restored prompts from bundle:", prompts);

                            // Reconstruct the prompts text from the JSON bundle
                            const promptText = prompts.map(p => {
                                if (p.weight && p.weight !== 1.0) {
                                    return `${p.text}, weight: ${p.weight}`;
                                }
                                return p.text;
                            }).join('\n');

                            // Update the prompts widget display
                            if (node.promptWidget) {
                                node.promptWidget.value = promptText;
                                console.log("[Wakawave Prompt] Restored prompts text:", promptText);
                            }

                            // Make sure bundle widget has the value
                            if (node.bundleWidget) {
                                node.bundleWidget.value = bundleValue;
                            }
                        } catch (e) {
                            console.error("[Wakawave Prompt] Failed to parse bundle on load:", e);
                        }
                    }
                }
            }, 50);
        };
    }
});

console.log("WanVideo Wakawave Prompt Builder extension loaded");
