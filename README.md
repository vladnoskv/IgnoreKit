# IgnoreKit

Add files and folders to ignore files from the VS Code Explorer.

IgnoreKit keeps ignore-file edits close to the file you are working with. Right-click a generated file, build folder, local config, package artifact, or extension packaging file and add it to the correct ignore file without opening that file by hand.

## Features

- Add files and folders from the Explorer context menu.
- Remove entries that IgnoreKit previously added.
- Always supports the workspace `.gitignore`.
- Detects `.npmignore`, `.vscodeignore`, `.dockerignore`, `.eslintignore`, `.prettierignore`, `.stylelintignore`, and 9 more ignore file types.
- Creates `.gitignore`, `.dockerignore`, `.eslintignore`, `.prettierignore`, and `.stylelintignore` when needed.
- Shows a picker when more than one ignore file applies.
- Avoids duplicate entries.
- Uses portable `/`-separated ignore paths.
- Adds trailing slashes for folders.
- Supports multi-root workspaces.
- Works with files and folders inside `node_modules`.

## Commands

Right-click a file or folder in the Explorer and choose:

- `Add to Ignore File...`
- `Remove from Ignore File...`

If one ignore file applies, IgnoreKit updates it immediately. If multiple ignore files apply, IgnoreKit asks which file you want to update.

## Installation

Install IgnoreKit from Visual Studio Marketplace in VS Code.

## Supported Ignore Files

| Ignore file | Detected when | Created if missing |
| --- | --- | --- |
| `.gitignore` | Always, at the selected workspace root | Yes |
| `.npmignore` | `package.json` exists in the nearest package root, and `.npmignore` exists | No |
| `.vscodeignore` | `package.json` exists in the nearest package root, and `.vscodeignore` exists | No |
| `.dockerignore` | `Dockerfile` or `docker-compose.yml` exists in a parent directory | Yes |
| `.eslintignore` | ESLint config (`.eslintrc.*`, `eslint.config.*`) exists in a parent directory | Yes |
| `.prettierignore` | Prettier config (`.prettierrc*`, `prettier.config.*`) exists in a parent directory | Yes |
| `.stylelintignore` | Stylelint config (`.stylelintrc*`, `stylelint.config.*`) exists in a parent directory | Yes |
| `.helmignore` | `Chart.yaml` exists and `.helmignore` already exists | No |
| `.cfignore` | `manifest.yml` exists and `.cfignore` already exists | No |
| `.terraformignore` | `main.tf` exists and `.terraformignore` already exists | No |
| `.serverlessignore` | `serverless.yml` exists and `.serverlessignore` already exists | No |
| `.babelignore` | Babel config (`.babelrc`, `babel.config.*`) exists and `.babelignore` already exists | No |
| `.eleventyignore` | Eleventy config (`.eleventy.js`, `eleventy.config.*`) exists and `.eleventyignore` already exists | No |
| `.vercelignore` | `vercel.json` exists and `.vercelignore` already exists | No |
| `.slugignore` | `Procfile` exists and `.slugignore` already exists | No |
| `.funcignore` | `host.json` or `function.json` exists and `.funcignore` already exists | No |

IgnoreKit looks upward from the selected file or folder to find the nearest configuration file for each tool. Each ignore file is offered from the directory where its corresponding tool configuration was found.

IgnoreKit no longer blocks operations inside `node_modules`.

## Managed Section

IgnoreKit preserves the rest of your ignore file and writes to its own managed section:

```gitignore
# IgnoreKit
# Added from VS Code Explorer
dist/
# End IgnoreKit
```

The remove command only removes entries from this section. It does not delete rules that you wrote manually elsewhere in the file.

## Tool Detection

For `.npmignore` and `.vscodeignore`, IgnoreKit detects common JavaScript package managers from lock files in the nearest package root to provide clearer picker labels:

- Bun: `bun.lock` or `bun.lockb`
- pnpm: `pnpm-lock.yaml`
- Yarn: `yarn.lock`
- npm: `package-lock.json`

For other ignore files, the tool name is shown in the picker label (e.g., `.dockerignore (Docker)`).

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
