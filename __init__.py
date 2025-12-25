"""
WanVideo Wakawave - Advanced LoRA & Prompt Tools
"""

import traceback

NODE_CLASS_MAPPINGS = {}
NODE_DISPLAY_NAME_MAPPINGS = {}

print("\n" + "="*75)
print("Loading WanVideo Wakawave Nodes...")
print("="*75)

# Import WanVideoWakawaveLoraLoader (Wakawave LoRA Loader)
try:
    from .WanVideoWakawaveLoraLoader import (
        NODE_CLASS_MAPPINGS as WAKAWAVE_LORA_MAPPINGS,
        NODE_DISPLAY_NAME_MAPPINGS as WAKAWAVE_LORA_DISPLAY_MAPPINGS
    )
    NODE_CLASS_MAPPINGS.update(WAKAWAVE_LORA_MAPPINGS)
    NODE_DISPLAY_NAME_MAPPINGS.update(WAKAWAVE_LORA_DISPLAY_MAPPINGS)
    print("✅ WanVideoWakawaveLoraLoader loaded")
except Exception as e:
    print(f"❌ Failed to load WanVideoWakawaveLoraLoader: {e}")
    traceback.print_exc()

# Import WanVideoWakawavePromptBuilder (Wakawave Prompt Builder)
try:
    from .WanVideoWakawavePromptBuilder import (
        NODE_CLASS_MAPPINGS as WAKAWAVE_PROMPT_MAPPINGS,
        NODE_DISPLAY_NAME_MAPPINGS as WAKAWAVE_PROMPT_DISPLAY_MAPPINGS
    )
    NODE_CLASS_MAPPINGS.update(WAKAWAVE_PROMPT_MAPPINGS)
    NODE_DISPLAY_NAME_MAPPINGS.update(WAKAWAVE_PROMPT_DISPLAY_MAPPINGS)
    print("✅ WanVideoWakawavePromptBuilder loaded")
except Exception as e:
    print(f"❌ Failed to load WanVideoWakawavePromptBuilder: {e}")
    traceback.print_exc()

# Web directory for JavaScript
WEB_DIRECTORY = "./web"

print(f"\n✅ Total nodes loaded: {len(NODE_CLASS_MAPPINGS)}")
for name in NODE_DISPLAY_NAME_MAPPINGS.values():
    print(f"   • {name}")
print("="*75 + "\n")

__all__ = ['NODE_CLASS_MAPPINGS', 'NODE_DISPLAY_NAME_MAPPINGS', 'WEB_DIRECTORY']
