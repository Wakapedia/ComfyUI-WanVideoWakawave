# Changelog

All notable changes to the ComfyUI-WanVideoWakawave project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [1.1.0] - 2025-12-30

### Added
- **Complete File Size Display Feature**
  - Backend API endpoint `/api/wanvideo/lora/sizes` to fetch LoRA file sizes
  - Individual file sizes displayed next to each LoRA name in node interface
  - Total combined size and count displayed in node header (e.g., "3 LoRAs • 1.5GB")
  - File sizes automatically fetched when:
    - Adding individual LoRAs to the loader
    - Loading preset templates
    - Restoring saved node configurations
  - Settings toggle to show/hide file sizes: "Show File Sizes" option in ⚙️ Settings menu
  - File size formatting helper consistent across backend and frontend
  - Asynchronous batch fetching for optimal performance when loading multiple LoRAs
  - Graceful fallback if file size data unavailable

## [1.0.7] - 2025-12-29

### Fixed
- **Critical:** Fixed memory leak in preset modal from unreleased event listeners (keyboard and dropdown handlers now properly cleaned up on modal close)
- Fixed event listener accumulation when opening/closing modal multiple times
- Fixed keyboard shortcuts (Enter, Delete, Escape) firing on closed modals
- Improved error handling in Python prompt builder with better type validation for config items
- Improved error handling in Python LoRA loader with better type validation
- Enhanced weight parsing in JavaScript with safer NaN detection
- Added null checks for widget references in preset loading
- Improved date parsing safety in preset modal preview panel
- Better error handling for JSON parsing with additional edge case coverage
- Fixed file import validation in preset modal with file size limits and structure validation

## [1.0.5] - 2025-12-28

### Added
- Support for weighted prompts in Prompt Builder with custom weight ranges (0.5-2.0)
- New modal interface for preset management with improved UX
- Ability to save and load multiple preset configurations for both LoRA Loader and Prompt Builder
- Enhanced drag-to-reorder functionality for LoRA management
- Per-LoRA strength control with fine-grained adjustment sliders
- Support for multiple prompt separators (comma, newline, space, pipe, double slash, none)
- Chainable node support for combining multiple LoRA Loaders and Prompt Builders
- Segment mode for Prompt Builder enabling different prompts for different video segments
- Enable/disable toggle for individual LoRAs for quick testing

### Changed
- Improved prompt builder UI with better visual hierarchy
- Enhanced preset modal styling with cleaner CSS design
- Optimized web extension architecture for better performance
- Updated documentation with comprehensive usage examples
- Refined LoRA loader interface for more intuitive workflow

### Fixed
- Fixed preset deletion not updating UI properly
- Corrected weight formatting in output prompts
- Improved error handling for missing LoRA files
- Fixed compatibility issues with WanVideo TextEncode Cached node
- Resolved drag-and-drop issues in Firefox browsers

### Removed
- Removed ComfyUI Manager auto-installation (manual installation recommended)

### Security
- Added input sanitization for prompt text to prevent injection attacks
- Improved validation of LoRA file paths

---

## [1.0.0] - 2025-12-01

### Added
- Initial release of WanVideo Wakawave
- Wakawave LoRA Loader node with unlimited LoRA management
- Wakawave Prompt Builder node with advanced prompt creation
- Basic preset save/load functionality
- Support for WANVIDLORA format output

