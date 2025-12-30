"""
WanVideo Wakawave - Advanced LoRA & Prompt Tools
"""

import traceback
import os
import json
import folder_paths
from aiohttp import web

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

# Cache verbose output toggle - set to True to see every cached LoRA file
WAKAWAVE_CACHE_VERBOSE = False

# Global cache for LoRA file sizes - populated on server startup
_lora_sizes_cache = {}

def _scan_and_cache_lora_sizes():
    """Scan all configured LoRAs directories (using ComfyUI's folder_paths) and cache file sizes."""
    global _lora_sizes_cache
    try:
        print("[Wakawave] Scanning all configured LoRAs directories...")
        
        # Get all loras directories from ComfyUI's folder_paths
        # ComfyUI loads extra_model_paths.yaml into folder_names_and_paths
        loras_dirs = []
        
        # Check if folder_names_and_paths exists (it should in ComfyUI)
        if hasattr(folder_paths, 'folder_names_and_paths'):
            print("[Wakawave] Using ComfyUI's folder_names_and_paths...")
            
            # folder_names_and_paths is a dict where:
            # key = folder type (e.g., "loras")
            # value = (list_of_paths, list_of_extensions)
            if 'loras' in folder_paths.folder_names_and_paths:
                paths_tuple = folder_paths.folder_names_and_paths['loras']
                if isinstance(paths_tuple, (tuple, list)):
                    # Extract the paths list (first element of tuple)
                    paths_list = paths_tuple[0] if isinstance(paths_tuple[0], (list, tuple)) else paths_tuple
                    
                    if isinstance(paths_list, (list, tuple)):
                        for path in paths_list:
                            if os.path.exists(path):
                                loras_dirs.append(path)
                                print(f"[Wakawave]   ✓ {path}")
                            else:
                                print(f"[Wakawave]   ✗ {path} (not found)")
            else:
                print("[Wakawave] No 'loras' entry in folder_names_and_paths, falling back to default")
                default_loras_dir = os.path.join(folder_paths.models_dir, "loras")
                if os.path.exists(default_loras_dir):
                    loras_dirs.append(default_loras_dir)
                    print(f"[Wakawave]   ✓ {default_loras_dir}")
        else:
            print("[Wakawave] folder_names_and_paths not available, using fallback method")
            default_loras_dir = os.path.join(folder_paths.models_dir, "loras")
            if os.path.exists(default_loras_dir):
                loras_dirs.append(default_loras_dir)
                print(f"[Wakawave]   ✓ {default_loras_dir}")
        
        if not loras_dirs:
            print("[Wakawave] ⚠️  No LoRAs directories found!")
            return
        
        # Scan all directories
        total_cached = 0
        for loras_dir in loras_dirs:
            try:
                if not os.path.exists(loras_dir):
                    continue
                
                lora_files = [f for f in os.listdir(loras_dir) if os.path.isfile(os.path.join(loras_dir, f))]
                
                for lora_file in lora_files:
                    try:
                        lora_path = os.path.join(loras_dir, lora_file)
                        size = os.path.getsize(lora_path)
                        _lora_sizes_cache[lora_file] = size
                        total_cached += 1
                    except Exception as e:
                        if WAKAWAVE_CACHE_VERBOSE:
                            print(f"[Wakawave] Error caching {lora_file}: {e}")
            except Exception as e:
                print(f"[Wakawave] Error scanning {loras_dir}: {e}")
        
        print(f"[Wakawave] ✅ Cached {total_cached} LoRA file sizes")
    except Exception as e:
        print(f"[Wakawave] Error in _scan_and_cache_lora_sizes: {e}")
        import traceback
        traceback.print_exc()

# API Routes
async def get_lora_file_sizes(request):
    """Get file sizes for LoRA files (from cache or by scanning)."""
    try:
        lora_names_param = request.rel_url.query.get('names', '')
        lora_names = [n.strip() for n in lora_names_param.split(',') if n.strip()]
        
        if not lora_names:
            print("[Wakawave API] No names provided in request")
            return web.json_response({})
        
        print(f"[Wakawave API] Requesting sizes for LoRAs: {lora_names}")
        print(f"[Wakawave API] Cache contains {len(_lora_sizes_cache)} entries")
        
        sizes = {}
        loras_dir = os.path.join(folder_paths.models_dir, "loras")
        
        for lora_name in lora_names:
            # Try cache first
            if lora_name in _lora_sizes_cache:
                sizes[lora_name] = _lora_sizes_cache[lora_name]
                print(f"[Wakawave API] ✅ Cache hit for '{lora_name}'")
            else:
                # Try to find the file and calculate size on-demand
                try:
                    # Try direct path first
                    lora_path = os.path.join(loras_dir, lora_name)
                    if os.path.isfile(lora_path):
                        size = os.path.getsize(lora_path)
                        sizes[lora_name] = size
                        _lora_sizes_cache[lora_name] = size  # Cache it for next time
                        print(f"[Wakawave API] ✅ Calculated on-demand for '{lora_name}': {size} bytes")
                    else:
                        # Try using ComfyUI's path resolver
                        try:
                            resolved_path = folder_paths.get_full_path("loras", lora_name)
                            size = os.path.getsize(resolved_path)
                            sizes[lora_name] = size
                            _lora_sizes_cache[lora_name] = size
                            print(f"[Wakawave API] ✅ Resolved path for '{lora_name}': {size} bytes")
                        except Exception as e2:
                            print(f"[Wakawave API] ⚠️  Could not resolve '{lora_name}': {e2}")
                except Exception as e:
                    print(f"[Wakawave API] ⚠️  Error getting size for '{lora_name}': {e}")
        
        print(f"[Wakawave API] Returning {len(sizes)} sizes: {list(sizes.keys())}")
        return web.json_response(sizes)
    except Exception as e:
        print(f"[Wakawave API] Error in get_lora_file_sizes: {e}")
        import traceback
        traceback.print_exc()
        return web.json_response({})

async def get_lora_cache_debug(request):
    """Debug endpoint - shows what's in the cache and what exists in the directory."""
    try:
        loras_dir = os.path.join(folder_paths.models_dir, "loras")
        
        # Get all files from disk
        disk_files = []
        if os.path.exists(loras_dir):
            disk_files = [f for f in os.listdir(loras_dir) if os.path.isfile(os.path.join(loras_dir, f))]
        
        return web.json_response({
            "cache_count": len(_lora_sizes_cache),
            "cache_keys": list(_lora_sizes_cache.keys()),
            "cache_sizes": {k: v for k, v in _lora_sizes_cache.items()},
            "disk_count": len(disk_files),
            "disk_files": disk_files,
            "loras_dir": loras_dir,
            "dir_exists": os.path.exists(loras_dir)
        })
    except Exception as e:
        print(f"[Wakawave Debug] Error: {e}")
        import traceback
        traceback.print_exc()
        return web.json_response({"error": str(e)})

# Direct route registration using module-level approach
# Try to get server instance and register route
try:
    print("[Wakawave] Attempting direct server route registration...")
    import server as server_module
    
    # First scan and cache LoRA sizes
    _scan_and_cache_lora_sizes()
    
    # Check if server is initialized
    if hasattr(server_module, 'PromptServer') and server_module.PromptServer.instance:
        print("[Wakawave] PromptServer instance found, registering route...")
        
        # Register using the app's router directly
        app = server_module.PromptServer.instance.app
        app.router.add_get('/wanvideo/lora/sizes', get_lora_file_sizes)
        print("✅ [Wakawave] Route registered: /wanvideo/lora/sizes")
    else:
        print("[Wakawave] Server not yet initialized, will register via add_routes")
except ImportError:
    print("[Wakawave] Could not import server module, will register via add_routes")
except AttributeError as e:
    print(f"[Wakawave] PromptServer not available: {e}")
except Exception as e:
    print(f"[Wakawave] Error in direct registration: {e}")

# Route registration - ComfyUI expects this exact function name and signature
def add_routes(app, routes=None):
    """Add routes - called by ComfyUI during initialization."""
    print("[Wakawave] ✅ add_routes function called by ComfyUI!")
    
    # Scan and cache LoRA sizes if not already done
    if not _lora_sizes_cache:
        _scan_and_cache_lora_sizes()
    
    try:
        # Register LoRA sizes API endpoint
        app.router.add_get('/wanvideo/lora/sizes', get_lora_file_sizes)
        print("✅ [Wakawave] Successfully registered: /wanvideo/lora/sizes")
    except Exception as e:
        print(f"⚠️  [Wakawave] Failed to register /wanvideo/lora/sizes: {e}")
        traceback.print_exc()
    
    try:
        # Also try with /api prefix as fallback
        app.router.add_get('/api/wanvideo/lora/sizes', get_lora_file_sizes)
        print("✅ [Wakawave] Also registered: /api/wanvideo/lora/sizes")
    except Exception as e:
        print(f"⚠️  [Wakawave] Could not register /api/wanvideo/lora/sizes: {e}")
    
    try:
        # Register debug endpoint
        app.router.add_get('/wanvideo/lora/cache/debug', get_lora_cache_debug)
        print("✅ [Wakawave] Also registered debug endpoint: /wanvideo/lora/cache/debug")
    except Exception as e:
        print(f"⚠️  [Wakawave] Could not register debug endpoint: {e}")

print(f"\n✅ Total nodes loaded: {len(NODE_CLASS_MAPPINGS)}")
for name in NODE_DISPLAY_NAME_MAPPINGS.values():
    print(f"   • {name}")
print("="*75 + "\n")

__all__ = ['NODE_CLASS_MAPPINGS', 'NODE_DISPLAY_NAME_MAPPINGS', 'WEB_DIRECTORY', 'add_routes']

