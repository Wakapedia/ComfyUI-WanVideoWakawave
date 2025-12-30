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

    @staticmethod
    def _format_file_size(size_bytes: int) -> str:
        """Format bytes to human-readable file size string."""
        for unit in ['B', 'KB', 'MB', 'GB']:
            if size_bytes < 1024:
                return f"{size_bytes:.1f}{unit}"
            size_bytes /= 1024
        return f"{size_bytes:.1f}TB"

    @staticmethod
    def get_lora_file_sizes(lora_names: list) -> dict:
        """Get file sizes for a list of LoRA names.
        
        Uses ComfyUI's folder_names_and_paths which respects extra_model_paths.yaml
        
        Args:
            lora_names: List of LoRA filenames (e.g., ["model.safetensors", "lora.safetensors"])
            
        Returns:
            Dictionary mapping lora_name to file_size in bytes
        """
        sizes = {}
        
        # Collect all possible loras directories from ComfyUI's configuration
        loras_dirs = []
        
        # Use ComfyUI's folder_names_and_paths which is populated from extra_model_paths.yaml
        if hasattr(folder_paths, 'folder_names_and_paths') and 'loras' in folder_paths.folder_names_and_paths:
            paths_tuple = folder_paths.folder_names_and_paths['loras']
            if isinstance(paths_tuple, (tuple, list)):
                # Extract the paths list (first element of tuple)
                paths_list = paths_tuple[0] if isinstance(paths_tuple[0], (list, tuple)) else paths_tuple
                if isinstance(paths_list, (list, tuple)):
                    loras_dirs.extend(paths_list)
        
        # Fallback to default directory
        if not loras_dirs:
            default_loras_dir = os.path.join(folder_paths.models_dir, "loras")
            if os.path.exists(default_loras_dir):
                loras_dirs.append(default_loras_dir)
        
        # Now search for each lora file in all directories
        for lora_name in lora_names:
            if not lora_name or lora_name == "None":
                continue
            
            found = False
            
            # First try ComfyUI's built-in path resolver
            try:
                lora_path = folder_paths.get_full_path("loras", lora_name)
                if os.path.isfile(lora_path):
                    sizes[lora_name] = os.path.getsize(lora_path)
                    found = True
            except:
                pass
            
            # If not found, try searching in all collected directories
            if not found:
                for loras_dir in loras_dirs:
                    if os.path.exists(loras_dir):
                        lora_path = os.path.join(loras_dir, lora_name)
                        if os.path.isfile(lora_path):
                            sizes[lora_name] = os.path.getsize(lora_path)
                            found = True
                            break
            
            # If still not found, set size to 0
            if not found:
                sizes[lora_name] = 0
        
        return sizes

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
                # Get file size in bytes
                file_size = os.path.getsize(lora_path) if os.path.isfile(lora_path) else 0
                
                lora_list.append({
                    "path": lora_path,
                    "strength": strength,
                    "name": lora_name,
                    "blocks": {},  # Empty dict - no block filtering
                    "layer_filter": "",  # Empty string - no layer filtering
                    "low_mem_load": False,  # Don't use low mem mode
                    "merge_loras": False,  # Tell WanVideoSetLoRAs not to merge
                    "file_size": file_size  # Add file size in bytes
                })
                enabled_count += 1
                size_display = self._format_file_size(file_size)
                print(f"  ✅ {enabled_count}. {lora_name[:50]:50s} @ {strength:.2f} ({size_display})")
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
        # Calculate total size of all loaded LoRAs
        total_size = sum(item.get("file_size", 0) for item in lora_list)
        total_size_display = self._format_file_size(total_size)
        print(f"✅ Total enabled: {enabled_count} LoRAs | Combined size: {total_size_display}")
        print("="*75 + "\n")

        return (lora_list,)


# Node registration
NODE_CLASS_MAPPINGS = {
    "WanVideoWakawaveLoraLoader": WanVideoWakawaveLoraLoader,
}

NODE_DISPLAY_NAME_MAPPINGS = {
    "WanVideoWakawaveLoraLoader": "🌊 WanVideo Wakawave LoRA Loader",
}
