# IgnoreKit Secret Checker Design

## Purpose

IgnoreKit will add a local secret checker for VS Code workspaces. It will scan the current repository and git history for likely exposed secrets, present a redacted report in a VS Code webview, and guide the user through safe remediation. The first version is self-contained and does not require external scanners.

The checker must treat secret remediation as incident response, not only cleanup. If a credential was committed, the report must say which key families need rotation even when history scrubbing is available.

## Scope

This design covers:

- A new VS Code command for scanning the active workspace repository.
- A self-contained secret detector with built-in patterns and redaction.
- Working-tree and git-history scanning.
- A webview report UI.
- Previewed remediation commands for history cleanup.
- Explicit user confirmation before any destructive or history-rewriting action.
- Unit tests for scanner, redaction, report generation, and command generation.

This design does not include:

- Automatic installation or invocation of external tools such as `gitleaks` or `git-filter-repo`.
- Automatic force-push, remote branch updates, credential rotation, or provider API calls.
- A full forensic incident workflow.
- Scanning outside the selected workspace folder.

## User Workflow

The command `IgnoreKit: Check Repository for Exposed Secrets` opens a webview for the selected workspace folder. If there are multiple workspace folders, the extension asks the user to choose one before opening the webview.

From the webview, the user can start a scan. The scan checks both tracked repository content and git history, then returns a redacted report. Findings include the suspected secret family, location, source, confidence, and rotation guidance.

The user can add exposed local files to `.gitignore` where applicable. This action reuses IgnoreKit's existing ignore-file helpers and does not rewrite history.

For history findings, the UI shows a remediation plan and exact commands. The extension never rewrites history without a second confirmation that clearly states the operation rewrites git history and may require collaborators to reclone or reset local branches. The first implementation can copy commands and may run only previewed local commands after explicit confirmation.

## Architecture

The feature will be split into focused modules:

- `secret-patterns.ts`: provider-specific and generic detector definitions.
- `secret-scanner.ts`: working-tree and history scanning orchestration.
- `secret-redaction.ts`: masking and stable display helpers.
- `secret-report.ts`: report models, grouping, summary counts, and rotation guidance.
- `secret-remediation.ts`: ignore-file suggestions and history cleanup command generation.
- `secret-checker-webview.ts`: webview lifecycle, HTML, CSP, and message handling.
- `extension.ts`: command registration and thin wiring only.

The scanner modules should not depend on `vscode` where avoidable. Keeping scanner and report logic independent makes unit tests direct and keeps the extension entry point small.

## Detection Model

The scanner uses built-in detectors for:

- GitHub tokens.
- npm tokens.
- Stripe publishable, secret, restricted, and webhook signing keys.
- OpenAI API keys.
- AWS access key IDs.
- PEM private key blocks.
- JWT-looking tokens.
- `.env` style assignments with suspicious key names such as `TOKEN`, `SECRET`, `PASSWORD`, `PRIVATE_KEY`, `API_KEY`, and `WEBHOOK_SECRET`.
- High-entropy suspicious values in assignment-like contexts.

Each detector returns:

- Secret family.
- Confidence: `high`, `medium`, or `low`.
- Redacted display value.
- File path when available.
- Line number when available.
- Source: `working-tree` or `git-history`.
- Commit SHA when found in history.
- Rotation guidance.

Provider-specific token formats are high confidence. Generic assignments and entropy detections are medium or low confidence depending on context.

## Scan Boundaries

Working-tree scans skip:

- `.git`.
- `node_modules`.
- `dist`.
- VSIX packages.
- Common binary files.
- Files above a conservative size limit.

Git-history scans use local git commands and must handle missing git, non-repository workspaces, and command failures with clear UI errors. The scanner should avoid loading unbounded command output into memory where practical and should cap per-file/blob inspection.

The webview must never display raw secrets. Logs, errors, reports, and command previews must use redacted values.

## Remediation

Remediation is split into three levels:

1. Ignore future local exposure by adding relevant files to `.gitignore`.
2. Rotate affected credentials based on the detected secret families.
3. Scrub committed files from history when the user decides the risk justifies rewriting history.

The first history cleanup command generation targets file paths, not arbitrary secret replacement. Path-based removal is easier to preview, test, and explain. The report must state that history cleanup does not revoke exposed credentials.

Command previews must include:

- What files are affected.
- Whether history will be rewritten.
- A warning that remotes and collaborator clones require coordination.
- The exact command text.

The extension may provide a run action only after explicit confirmation. It must not run force-push commands.

## Webview Design

The webview uses VS Code theme variables and a strict Content Security Policy with a nonce. It does not load remote scripts, styles, images, or fonts.

The layout includes:

- Header with repository name, scan button, and current status.
- Summary strip with counts by source and confidence.
- Findings table with filters for source and confidence.
- Finding detail panel with redacted value, locations, commit context, and rotation guidance.
- Remediation panel with ignore suggestions and command previews.

The UI should be compact and usable inside VS Code, not a marketing page. It should support empty state, scan running state, error state, no findings state, and findings state.

## Error Handling

The extension reports:

- No workspace folder selected.
- Workspace is not a git repository.
- Git command unavailable or failed.
- Scan was skipped for large or binary files.
- Remediation cannot proceed because no path-based cleanup target exists.

Errors should be specific without exposing secret material or command output that might contain secrets.

## Testing

Unit tests will cover:

- Provider-specific pattern detection.
- Generic assignment and entropy detection.
- Redaction behavior.
- Report grouping and rotation guidance.
- Working-tree scan exclusions.
- History cleanup command generation.
- Webview message reducer or handler logic where practical.

Manual validation will include:

- `npm run lint`.
- `npm test -- --run`.
- `npm run compile`.
- Running the extension in VS Code and scanning a disposable local repository with fake secrets.

## Future External Tool Hooks

Later versions can optionally detect installed tools such as `gitleaks` and `git-filter-repo`. Those hooks should be additive. The self-contained scanner remains the fallback, and any external command execution must still be previewed and explicitly confirmed.
