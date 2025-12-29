"""
WanVideo Wakawave Prompt Builder
Advanced prompt management with save/load presets and segment-based control
"""

import json
from typing import Union, List, Dict, Any

class WanVideoWakawavePromptBuilder:
    """
    Wakawave-style prompt builder with unlimited add/remove, save/load presets

    Features:
    - Save/load prompt presets
    - Segment-based prompting for different video sections
    - Weight control for each prompt
    - Multiple separator options
    """

    @classmethod
    def INPUT_TYPES(cls):
        return {
            "required": {},
            "optional": {
                "prev_positive": ("STRING", {"forceInput": True}),
                "prev_negative": ("STRING", {"forceInput": True}),
                "separator": (["none", "comma", "newline", "space", "pipe", "double_slash"], {"default": "none"}),
                "use_weights": ("BOOLEAN", {"default": True}),
                "segment_mode": ("BOOLEAN", {"default": False, "tooltip": "Enable segment-based prompting for different video segments"}),
                "segment_number": ("INT", {"default": 0, "min": 0, "max": 100, "step": 1, "tooltip": "Current segment number (0-based)"}),
            },
            "hidden": {
                "positive_prompts": "STRING",  # Direct text from the text widget (serialized)
                "negative_prompts": "STRING",  # Direct text from the text widget (serialized)
                "positive_bundle": "STRING",   # JSON from Wakawave UI - positive prompts (backup)
                "negative_bundle": "STRING",   # JSON from Wakawave UI - negative prompts (backup)
            }
        }

    RETURN_TYPES = ("STRING", "STRING")
    RETURN_NAMES = ("positive", "negative")
    FUNCTION = "build_prompt"
    CATEGORY = "WanVideo/Prompts"
    DESCRIPTION = "Wakawave-style prompt builder with save/load presets and segment control"

    def build_prompt(
        self,
        prev_positive: Union[str, None] = None,
        prev_negative: Union[str, None] = None,
        separator: str = "none",
        use_weights: bool = True,
        segment_mode: bool = False,
        segment_number: int = 0,
        positive_prompts: Union[str, None] = None,
        negative_prompts: Union[str, None] = None,
        positive_bundle: Union[str, None] = None,
        negative_bundle: Union[str, None] = None,
        **kwargs
    ):
        """
        Build final positive and negative prompts from serialized text or Wakawave UI bundles

        Args:
            prev_positive: Previous positive prompt to prepend
            prev_negative: Previous negative prompt to prepend
            separator: How to join prompts (none, comma, newline, space, pipe, double_slash)
            use_weights: Whether to apply weights like (text:1.2)
            segment_mode: Enable segment-based prompting
            segment_number: Current segment number (for segment mode)
            positive_prompts: Direct text from the text widget (serialized)
            negative_prompts: Direct text from the text widget (serialized)
            positive_bundle: JSON string from Wakawave UI containing positive prompt configs (backup)
            negative_bundle: JSON string from Wakawave UI containing negative prompt configs (backup)
        """

        print("\n" + "="*75)
        print("🌊 WanVideo Wakawave Prompt Builder")
        print("="*75)
        
        # Validate segment_number is an integer
        try:
            segment_number = int(segment_number)
        except (ValueError, TypeError):
            segment_number = 0
            print(f"⚠️  Invalid segment_number, using default: 0")

        # Build positive prompt
        print("\n📝 Building POSITIVE prompt:")
        positive_prompt = self._build_single_prompt(
            positive_bundle, prev_positive, separator, use_weights, segment_mode, segment_number, "positive"
        )

        # Build negative prompt
        print("\n📝 Building NEGATIVE prompt:")
        negative_prompt = self._build_single_prompt(
            negative_bundle, prev_negative, separator, use_weights, segment_mode, segment_number, "negative"
        )

        print("="*75 + "\n")

        return (positive_prompt, negative_prompt)

    def _build_single_prompt(
        self,
        prompt_bundle: Union[str, None],
        prev_prompt: Union[str, None],
        separator: str,
        use_weights: bool,
        segment_mode: bool,
        segment_number: int,
        prompt_type: str  # "positive" or "negative"
    ) -> str:
        """Helper method to build a single prompt (positive or negative)"""

        # Start with previous prompt if provided
        prompt_parts = []
        if prev_prompt:
            prompt_parts.append(prev_prompt)
            print(f"  📌 Previous {prompt_type}: {prev_prompt[:50]}...")

        # Parse the bundle from Wakawave UI
        if not prompt_bundle or not isinstance(prompt_bundle, str) or prompt_bundle.strip() == "":
            print(f"  ⚠️  No {prompt_type} bundle received from UI")
            return prev_prompt or ""

        try:
            prompt_configs = json.loads(prompt_bundle)
            if not isinstance(prompt_configs, list):
                print(f"  ❌ {prompt_type} bundle is not a list, got {type(prompt_configs).__name__}")
                return prev_prompt or ""
            print(f"  📦 Parsed {len(prompt_configs)} {prompt_type} entries from bundle")
        except (json.JSONDecodeError, ValueError) as e:
            print(f"  ❌ Failed to parse {prompt_type} bundle: {e}")
            return prev_prompt or ""

        # Segment mode handling
        if segment_mode:
            print(f"  🎬 Segment mode enabled - Using segment {segment_number}")
            segment_prompts = self._parse_segments(prompt_configs)

            if segment_number in segment_prompts:
                selected_configs = segment_prompts[segment_number]
                print(f"  ✅ Found {len(selected_configs)} prompts for segment {segment_number}")
            else:
                # Fallback to highest segment if requested segment doesn't exist
                max_segment = max(segment_prompts.keys()) if segment_prompts else 0
                if max_segment >= 0 and segment_number > max_segment:
                    print(f"  ⚠️  Segment {segment_number} not found, using segment {max_segment}")
                    selected_configs = segment_prompts.get(max_segment, [])
                else:
                    print(f"  ⚠️  No prompts found for segment {segment_number}")
                    selected_configs = []

            prompt_configs = selected_configs

        # Process each prompt entry
        enabled_count = 0
        for idx, config in enumerate(prompt_configs, 1):
            # Validate config is a dictionary
            if not isinstance(config, dict):
                print(f"    ⚠️  Skipping invalid config (not a dict): {config}")
                continue
            
            # Check if enabled
            if not config.get('enabled', True):
                continue

            text = config.get('text', '')
            if not isinstance(text, str):
                text = str(text) if text is not None else ''
            text = text.strip()
            if not text:
                continue

            try:
                weight = float(config.get('weight', 1.0))
            except (ValueError, TypeError):
                print(f"    ⚠️  Invalid weight value, using default 1.0")
                weight = 1.0

            # Format with weight if enabled
            if use_weights and weight != 1.0:
                formatted = f"({text}:{weight:.2f})"
            else:
                formatted = text

            prompt_parts.append(formatted)
            enabled_count += 1

            # Print with truncation for long prompts
            display_text = text[:50] + "..." if len(text) > 50 else text
            print(f"    ✅ {enabled_count}. {display_text:48s} @ {weight:.2f}")

        print(f"  ✅ Total enabled: {enabled_count} {prompt_type} prompts")

        # Join prompts based on separator
        if separator == "comma":
            sep = ", "
        elif separator == "newline":
            sep = "\n"
        elif separator == "space":
            sep = " "
        elif separator == "pipe":
            sep = " | "
        elif separator == "double_slash":
            sep = " // "
        else:  # none
            sep = ""

        final_prompt = sep.join(prompt_parts)

        print(f"  📤 Final {prompt_type} ({len(final_prompt)} chars): {final_prompt[:100]}...")

        return final_prompt

    def _parse_segments(self, prompt_configs: List[Dict]) -> Dict[int, List[Dict]]:
        """
        Parse segment-based prompts from configs.

        Supports formats:
        - "segment 0: prompt text"
        - "seg 0: prompt text"
        - "0: prompt text" (if starts with digit)

        Args:
            prompt_configs: List of prompt config dictionaries

        Returns:
            Dictionary mapping segment number to list of prompt configs
        """
        import re

        segment_map = {}

        for config in prompt_configs:
            if not isinstance(config, dict):
                continue
            text = config.get('text', '')
            if not isinstance(text, str):
                text = str(text) if text is not None else ''
            text = text.strip()
            if not text:
                continue

            # Try to parse segment number from text
            # Format: "segment 0: prompt" or "seg 0: prompt" or "0: prompt"
            segment_match = re.match(r'^(?:segment|seg)?\s*(\d+)\s*:\s*(.+)', text, re.IGNORECASE)

            if segment_match:
                segment_num = int(segment_match.group(1))
                prompt_text = segment_match.group(2).strip()

                # Create new config with cleaned text
                new_config = config.copy()
                new_config['text'] = prompt_text

                if segment_num not in segment_map:
                    segment_map[segment_num] = []
                segment_map[segment_num].append(new_config)
            else:
                # No segment marker - treat as segment 0
                if 0 not in segment_map:
                    segment_map[0] = []
                segment_map[0].append(config)

        return segment_map


# Register the node
NODE_CLASS_MAPPINGS = {
    "WanVideoWakawavePromptBuilder": WanVideoWakawavePromptBuilder
}

NODE_DISPLAY_NAME_MAPPINGS = {
    "WanVideoWakawavePromptBuilder": "🌊 WanVideo Wakawave Prompt Builder"
}
