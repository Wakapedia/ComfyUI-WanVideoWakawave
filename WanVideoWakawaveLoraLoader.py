"""
WanVideo Wakawave LoRA Loader
Advanced LoRA management with save/load presets and dynamic add/remove
Adapted from ND Super Nodes UI, outputs WANVIDLORA for WanVideo
"""

import os
import json
import folder_paths
from pathlib import Path
from typing import Union, Dict, Any, Tuple, List


class WanVideoWakawaveLoraLoader:
    """
    WanVideo Wakawave LoRA Loader

    Features:
    - Unlimited add/remove LoRAs
    - Save/load presets
    - Drag-to-reorder
    - Per-LoRA strength control
    - Outputs WANVIDLORA for WanVideo
    """

    CATEGORY = "WanVideo/Loaders"
    RETURN_TYPES = ("WANVIDLORA",)
    RETURN_NAMES = ("lora",)
    FUNCTION = "load_loras"

    @classmethod
    def INPUT_TYPES(cls):
        return {
            "required": {},
            "optional": {
                "prev_lora": ("WANVIDLORA",),
            },
            "hidden": {
                # Frontend provides JSON array of lora configs
                # Hidden from UI, managed by the Wakawave React interface
                "lora_bundle": "STRING",
            }
        }

    def load_loras(self, prev_lora=None, lora_bundle: Union[str, None] = None, **kwargs) -> Tuple[List]:
        """
        Load multiple LoRAs from Wakawave bundle and return WANVIDLORA structure.
        """
        # Initialize LoRA list
        lora_list = []
        if prev_lora is not None:
            if isinstance(prev_lora, list):
                lora_list = prev_lora.copy()
            elif isinstance(prev_lora, dict):
                lora_list = [prev_lora]

        print("\n" + "="*75)
        print("🌊 WanVideo Wakawave LoRA Loader")
        print("="*75)

        # Parse lora configs from bundle
        lora_configs: List[Dict[str, Any]] = []

        if isinstance(lora_bundle, str) and lora_bundle.strip():
            try:
                parsed = json.loads(lora_bundle)
                if isinstance(parsed, list):
                    lora_configs = parsed
                elif isinstance(parsed, dict):
                    print("⚠️  lora_bundle is a dict, converting to list")
                    lora_configs = list(parsed.values()) if parsed else []
                else:
                    print(f"⚠️  lora_bundle has unexpected type: {type(parsed).__name__}")
            except json.JSONDecodeError as e:
                print(f"⚠️  Failed to parse lora_bundle JSON: {e}")
        else:
            # Fallback: try kwargs (for testing)
            for key, val in kwargs.items():
                if key.lower().startswith("lora_") and isinstance(val, dict):
                    lora_configs.append(val)

        print(f"📦 Parsed {len(lora_configs)} LoRA configs from bundle")

        enabled_count = 0

        for idx, config in enumerate(lora_configs):
            if not isinstance(config, dict):
                print(f"  ⚠️  Skipping invalid config at index {idx} (not a dict)")
                continue

            # Check if enabled
            enabled = bool(config.get('enabled', config.get('on', False)))
            if not enabled:
                continue

            # Get LoRA name
            lora_name = config.get('lora', 'None')
            if not lora_name or lora_name == "None" or not isinstance(lora_name, str):
                continue

            # Get strength
            try:
                strength = float(config.get('strength', config.get('strength_model', 1.0)))
                # Validate strength is in reasonable range
                if strength <= 0 or strength > 2.0:
                    print(f"  ⚠️  Strength {strength:.2f} out of range, clamping to 1.0")
                    strength = max(0.1, min(2.0, strength))
            except (ValueError, TypeError):
                print(f"  ⚠️  Invalid strength value, using default 1.0")
                strength = 1.0

            # Build LoRA path using ComfyUI's proper path resolver
            try:
                lora_path = folder_paths.get_full_path("loras", lora_name)
            except:
                # Fallback with path traversal protection
                lora_path = os.path.join(folder_paths.models_dir, "loras", lora_name)
                # Resolve to absolute path and verify it's within loras directory
                loras_dir = Path(folder_paths.models_dir) / "loras"
                try:
                    resolved_path = Path(lora_path).resolve()
                    if not resolved_path.is_relative_to(loras_dir):
                        print(f"  ⚠️  Security: Rejected path outside loras directory: {lora_name}")
                        continue
                    lora_path = str(resolved_path)
                except (ValueError, OSError) as e:
                    print(f"  ⚠️  Invalid path: {lora_name} - {e}")
                    continue

            if lora_path and os.path.exists(lora_path):
                lora_list.append({
                    "path": lora_path,
                    "strength": strength,
                    "name": lora_name,
                    "blocks": {},  # Empty dict - no block filtering
                    "layer_filter": "",  # Empty string - no layer filtering
                    "low_mem_load": False,  # Don't use low mem mode
                    "merge_loras": False  # Tell WanVideoSetLoRAs not to merge
                })
                enabled_count += 1
                print(f"  ✅ {enabled_count}. {lora_name[:60]:60s} @ {strength:.2f}")
            else:
                print(f"  ⚠️  LoRA not found: {lora_name}")
                # Try to help debug
                loras_dir = os.path.join(folder_paths.models_dir, "loras")
                print(f"      Searched in: {loras_dir}")
                # List similar files
                if os.path.exists(loras_dir):
                    similar = [f for f in os.listdir(loras_dir) if lora_name.split('.')[0].lower() in f.lower()]
                    if similar:
                        print(f"      Similar files found: {similar[:3]}")

        print("="*75)
        print(f"✅ Total enabled: {enabled_count} LoRAs")
        print("="*75 + "\n")

        return (lora_list,)


# Node registration
NODE_CLASS_MAPPINGS = {
    "WanVideoWakawaveLoraLoader": WanVideoWakawaveLoraLoader,
}

NODE_DISPLAY_NAME_MAPPINGS = {
    "WanVideoWakawaveLoraLoader": "🌊 WanVideo Wakawave LoRA Loader",
}
