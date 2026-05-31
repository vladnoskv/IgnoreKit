# IgnoreKit

Add files and folders to ignore files from the VS Code Explorer.

IgnoreKit keeps ignore-file edits close to the file you are working with. Right-click a generated file, build folder, local config, package artifact, or extension packaging file and add it to the correct ignore file without opening that file by hand.

## Features

- Add files and folders from the Explorer context menu.
- Remove entries that IgnoreKit previously added.
- Always supports the workspace `.gitignore`.
- Detects existing package-level `.npmignore` and `.vscodeignore` files.
- Shows a picker when more than one ignore file applies.
- Creates `.gitignore` when needed.
- Never creates `.npmignore` or `.vscodeignore` automatically.
- Avoids duplicate entries.
- Uses portable `/`-separated ignore paths.
- Adds trailing slashes for folders.
- Supports multi-root workspaces.

## Commands

Right-click a file or folder in the Explorer and choose:

- `Add to Ignore File...`
- `Remove from Ignore File...`

If one ignore file applies, IgnoreKit updates it immediately. If multiple ignore files apply, IgnoreKit asks which file you want to update.

## Installation

Install IgnoreKit from Visual Studio Marketplace in VS Code.

## Supported Ignore Files

| Ignore file | When it is available | Created if missing |
| --- | --- | --- |
| `.gitignore` | Always, at the selected workspace root | Yes |
| `.npmignore` | Only when it already exists in the nearest package root | No |
| `.vscodeignore` | Only when it already exists in the nearest package root | No |

IgnoreKit looks upward from the selected file or folder to find the nearest `package.json`. Package ignore files are only offered from that nearest package root, so unrelated packages in the same workspace are left alone.

IgnoreKit does not scan or update paths inside `node_modules`.

## Managed Section

IgnoreKit preserves the rest of your ignore file and writes to its own managed section:

```gitignore
# IgnoreKit
# Added from VS Code Explorer
dist/
# End IgnoreKit
```

The remove command only removes entries from this section. It does not delete rules that you wrote manually elsewhere in the file.

## Package Awareness

For package ignore files, IgnoreKit detects common JavaScript package managers from lock files in the nearest package root:

- Bun: `bun.lock` or `bun.lockb`
- pnpm: `pnpm-lock.yaml`
- Yarn: `yarn.lock`
- npm: `package-lock.json`

Package manager detection is used for clearer picker labels. It does not change which ignore files are created.

## Examples

Adding `dist/` in a package that already has `.npmignore` may offer both:

- `.gitignore`
- `.npmignore (npm package)`

Adding `.env` at the workspace root writes:

```gitignore
/.env
```

Adding a folder writes:

```gitignore
dist/
```

## Privacy

IgnoreKit runs locally in VS Code. It does not send file paths, project data, or ignore-file contents to any external service.


## Contributing

Issues and pull requests are welcome. Please keep changes focused, add tests for behavior changes, and run the validation commands before opening a pull request.

## License

MIT. See the LICENSE file in this repository.
