# Changelog

All notable changes to the ComfyUI-WanVideoWakawave project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

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

