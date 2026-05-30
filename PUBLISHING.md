# Publishing Checklist

Use this checklist before uploading a VSIX to Visual Studio Marketplace.

## Current Release

- Version: `0.0.3`
- VSIX: `ignorekit-0.0.3.vsix`
- Publisher ID in manifest: `vladnoskv`
- Repository: `https://github.com/vladnoskv/IgnoreKit`
- Icon: `media/icon.png`
- Gallery banner: configured in `package.json`

## Required

- Create or confirm your Visual Studio Marketplace publisher.
- Set `publisher` in `package.json` to your Marketplace publisher ID, not your display name.
- Make sure `name` is available on the Marketplace.
- Keep `version` as valid SemVer and increment it for every published update.
- Include `README.md`, `CHANGELOG.md`, and `LICENSE`.
- Run validation:

```sh
npm run lint
npm test -- --run
npm run compile
npm run package
```

## Strongly Recommended

- Confirm the public repository metadata in `package.json` points to `https://github.com/vladnoskv/IgnoreKit`.
- Confirm `icon` points to `media/icon.png`.
- Confirm `galleryBanner.color` and `galleryBanner.theme` are set for Marketplace presentation.
- Install the packaged VSIX locally and test the Explorer commands in a real VS Code window.

## Upload

Upload the generated `.vsix` file in the Visual Studio Marketplace publisher management page.

Generated `.vsix` files are ignored by git and should not be committed.
