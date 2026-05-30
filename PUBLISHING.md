# Publishing Checklist

Use this checklist before uploading a VSIX to Visual Studio Marketplace.

## Required

- Create or confirm your Visual Studio Marketplace publisher.
- Set `publisher` in `package.json` to your Marketplace publisher ID.
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

- Add the public repository URL to `package.json`:

```json
"repository": {
  "type": "git",
  "url": "https://github.com/<owner>/<repo>.git"
},
"bugs": {
  "url": "https://github.com/<owner>/<repo>/issues"
},
"homepage": "https://github.com/<owner>/<repo>#readme"
```

- Add a non-SVG Marketplace icon and reference it from `package.json`.
- Add `galleryBanner.color` and `galleryBanner.theme` for Marketplace presentation.
- Install the packaged VSIX locally and test the Explorer commands in a real VS Code window.

## Upload

Upload the generated `.vsix` file in the Visual Studio Marketplace publisher management page.

Generated `.vsix` files are ignored by git and should not be committed.
