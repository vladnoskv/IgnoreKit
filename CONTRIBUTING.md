# Contributing

Thanks for helping improve IgnoreKit.

## Local Setup

```sh
npm install
```

## Validate Changes

Run these before opening a pull request:

```sh
npm run lint
npm test -- --run
npm run compile
```

## Development Notes

- Keep VS Code API code in `src/extension.ts`.
- Keep deterministic ignore-file behavior in `src/ignore-file.ts`.
- Keep target detection rules in `src/ignore-targets.ts`.
- Add or update tests for behavior changes.
- Avoid adding dependencies unless they remove meaningful complexity.

## Release Packaging

```sh
npm run package
```

The generated `.vsix` is ignored by git and should not be committed.
