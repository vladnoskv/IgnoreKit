# Changelog

## 1.1.0

- Expanded ignore file support: `.dockerignore`, `.eslintignore`, `.prettierignore`, `.stylelintignore`, `.helmignore`, `.cfignore`, `.terraformignore`, `.serverlessignore`, `.babelignore`, `.eleventyignore`, `.vercelignore`, `.slugignore`, `.funcignore`.
- IgnoreKit now creates `.dockerignore`, `.eslintignore`, `.prettierignore`, and `.stylelintignore` when their corresponding tool configs exist.
- Removed `node_modules` restriction — IgnoreKit now works with files and folders inside `node_modules`.
- Managed section is now cleaned up when the last entry is removed (no more empty section cruft).
- Added progress notification for directory scanning.
- Improved error handling when removing from a non-existent ignore file.
- Unified `isInsideNodeModules` and `isSamePathOrChild` functions (removed code duplication).
- Added BOM (Byte Order Mark) handling in ignore files.
- Added comprehensive test suite for framework detection (37 tests across 3 test files).

## 0.0.3

- Added a Marketplace icon and gallery banner metadata.
- Added public repository, issue, and homepage metadata for Marketplace links.
- Updated public documentation and clarified Marketplace publisher ID requirements.
- Documented local VSIX installation and the current publish-ready package details.

## 0.0.2

- Initial release with Explorer context menu support for adding and removing files and folders in `.gitignore`, `.npmignore`, and `.vscodeignore`.
