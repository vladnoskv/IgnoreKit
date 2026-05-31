# Secret Checker Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a self-contained IgnoreKit secret checker that scans the working tree and git history, shows a redacted webview report, and previews remediation commands before any risky action.

**Architecture:** Keep scanner, redaction, report, and remediation logic independent from `vscode` so Vitest can cover the risky behavior directly. Keep `extension.ts` thin by delegating webview UI and command handling to `secret-checker-webview.ts`.

**Tech Stack:** TypeScript, VS Code extension API, Node.js `fs/promises` and `child_process`, Vitest, existing esbuild bundle.

---

## File Structure

- Create `src/secret-types.ts`: shared types for findings, scan inputs, reports, and remediation plans.
- Create `src/secret-redaction.ts`: value redaction and stable fingerprints for grouping.
- Create `src/secret-patterns.ts`: provider-specific and generic secret detectors.
- Create `src/secret-report.ts`: report summary, grouping, and rotation guidance.
- Create `src/secret-remediation.ts`: path-based `.gitignore` suggestions and history cleanup command previews.
- Create `src/secret-scanner.ts`: working-tree traversal and git-history scanning with injected filesystem and command dependencies for tests.
- Create `src/secret-checker-webview.ts`: VS Code webview HTML, CSP, state rendering, and message handling.
- Modify `src/extension.ts`: register the new command and invoke the webview controller.
- Modify `package.json`: contribute `ignoreKit.checkSecrets`.
- Add tests beside implementation files with `.test.ts` suffix.
- Update `README.md`: document the new checker and its safety boundaries.

## Task 1: Shared Types and Redaction

**Files:**
- Create: `src/secret-types.ts`
- Create: `src/secret-redaction.ts`
- Create: `src/secret-redaction.test.ts`

- [ ] **Step 1: Write the failing redaction tests**

```typescript
import { describe, expect, it } from 'vitest';

import { createSecretFingerprint, redactSecretValue } from './secret-redaction';

describe('redactSecretValue', () => {
  it('keeps short context without exposing the full secret', () => {
    expect(redactSecretValue('sk_live_1234567890abcdef')).toBe('sk_l...cdef');
  });

  it('fully masks short values', () => {
    expect(redactSecretValue('abc123')).toBe('******');
  });
});

describe('createSecretFingerprint', () => {
  it('creates the same fingerprint for the same secret without returning the secret', () => {
    const first = createSecretFingerprint('sk_live_1234567890abcdef');
    const second = createSecretFingerprint('sk_live_1234567890abcdef');

    expect(first).toBe(second);
    expect(first).not.toContain('sk_live');
  });
});
```

- [ ] **Step 2: Run the redaction tests and verify RED**

Run: `npm test -- --run src/secret-redaction.test.ts`

Expected: FAIL because `src/secret-redaction.ts` does not exist.

- [ ] **Step 3: Implement shared types and redaction**

Create `src/secret-types.ts`:

```typescript
export type SecretConfidence = 'high' | 'medium' | 'low';
export type SecretSource = 'working-tree' | 'git-history';

export interface SecretLocation {
  readonly path: string;
  readonly line?: number;
  readonly commit?: string;
}

export interface SecretFinding {
  readonly id: string;
  readonly family: string;
  readonly confidence: SecretConfidence;
  readonly source: SecretSource;
  readonly location: SecretLocation;
  readonly redactedValue: string;
  readonly fingerprint: string;
  readonly rotationGuidance: string;
}

export interface SecretScanReport {
  readonly repositoryPath: string;
  readonly scannedAtIso: string;
  readonly findings: readonly SecretFinding[];
  readonly summary: SecretReportSummary;
  readonly rotationFamilies: readonly string[];
  readonly skipped: readonly string[];
}

export interface SecretReportSummary {
  readonly total: number;
  readonly bySource: Readonly<Record<SecretSource, number>>;
  readonly byConfidence: Readonly<Record<SecretConfidence, number>>;
}

export interface SecretMatch {
  readonly family: string;
  readonly confidence: SecretConfidence;
  readonly value: string;
  readonly index: number;
  readonly rotationGuidance: string;
}
```

Create `src/secret-redaction.ts`:

```typescript
import { createHash } from 'crypto';

export function redactSecretValue(value: string): string {
  if (value.length <= 8) {
    return '*'.repeat(value.length);
  }

  return `${value.slice(0, 4)}...${value.slice(-4)}`;
}

export function createSecretFingerprint(value: string): string {
  return createHash('sha256').update(value).digest('hex').slice(0, 16);
}
```

- [ ] **Step 4: Run the redaction tests and verify GREEN**

Run: `npm test -- --run src/secret-redaction.test.ts`

Expected: PASS.

- [ ] **Step 5: Commit Task 1**

```bash
git add src/secret-types.ts src/secret-redaction.ts src/secret-redaction.test.ts
git commit -m "feat: add secret redaction primitives"
```

## Task 2: Secret Pattern Detection

**Files:**
- Create: `src/secret-patterns.ts`
- Create: `src/secret-patterns.test.ts`
- Modify: `src/secret-types.ts`

- [ ] **Step 1: Write failing detector tests**

```typescript
import { describe, expect, it } from 'vitest';

import { detectSecretsInText } from './secret-patterns';

describe('detectSecretsInText', () => {
  it('detects high-confidence provider keys', () => {
    const text = [
      'OPENAI_API_KEY=sk-proj-abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789',
      'STRIPE_SECRET_KEY=sk_live_abcdefghijklmnopqrstuvwxyz',
      'NPM_TOKEN=npm_abcdefghijklmnopqrstuvwxyz1234567890'
    ].join('\n');

    expect(detectSecretsInText(text).map((match) => match.family)).toEqual([
      'OpenAI API key',
      'Stripe secret key',
      'npm token'
    ]);
    expect(detectSecretsInText(text).every((match) => match.confidence === 'high')).toBe(true);
  });

  it('detects generic secret assignments with medium confidence', () => {
    const matches = detectSecretsInText('WEBHOOK_SECRET="super-secret-value-123456789"');

    expect(matches).toHaveLength(1);
    expect(matches[0]).toMatchObject({
      family: 'Generic secret assignment',
      confidence: 'medium',
      value: 'super-secret-value-123456789'
    });
  });

  it('does not flag obvious placeholders', () => {
    expect(detectSecretsInText('API_KEY=your-api-key-here')).toEqual([]);
  });
});
```

- [ ] **Step 2: Run detector tests and verify RED**

Run: `npm test -- --run src/secret-patterns.test.ts`

Expected: FAIL because `detectSecretsInText` does not exist.

- [ ] **Step 3: Implement detectors**

Create detectors for GitHub, npm, Stripe, OpenAI, AWS access key IDs, PEM private keys, JWT-looking tokens, generic secret assignments, and high-entropy assignment values. Use global regex execution with `matchAll`, skip placeholder values matching `/^(your-|example|placeholder|changeme|test|dummy)/iu`, and return `SecretMatch[]`.

Required public API:

```typescript
import type { SecretConfidence, SecretMatch } from './secret-types';

interface SecretDetector {
  readonly family: string;
  readonly confidence: SecretConfidence;
  readonly pattern: RegExp;
  readonly valueGroup?: number;
  readonly rotationGuidance: string;
}

export function detectSecretsInText(text: string): SecretMatch[] {
  const matches: SecretMatch[] = [];

  for (const detector of detectors) {
    for (const match of text.matchAll(detector.pattern)) {
      const value = match[detector.valueGroup ?? 0];

      if (!value || isPlaceholder(value)) {
        continue;
      }

      matches.push({
        family: detector.family,
        confidence: detector.confidence,
        value,
        index: match.index ?? 0,
        rotationGuidance: detector.rotationGuidance
      });
    }
  }

  return dedupeMatches(matches);
}
```

- [ ] **Step 4: Run detector tests and verify GREEN**

Run: `npm test -- --run src/secret-patterns.test.ts`

Expected: PASS.

- [ ] **Step 5: Commit Task 2**

```bash
git add src/secret-types.ts src/secret-patterns.ts src/secret-patterns.test.ts
git commit -m "feat: detect common exposed secrets"
```

## Task 3: Report and Remediation Models

**Files:**
- Create: `src/secret-report.ts`
- Create: `src/secret-report.test.ts`
- Create: `src/secret-remediation.ts`
- Create: `src/secret-remediation.test.ts`

- [ ] **Step 1: Write failing report tests**

```typescript
import { describe, expect, it } from 'vitest';

import { createSecretScanReport } from './secret-report';
import type { SecretFinding } from './secret-types';

const finding: SecretFinding = {
  id: 'one',
  family: 'Stripe secret key',
  confidence: 'high',
  source: 'git-history',
  location: { path: '.env', line: 1, commit: 'abc1234' },
  redactedValue: 'sk_l...abcd',
  fingerprint: 'fingerprint',
  rotationGuidance: 'Rotate the Stripe key in the Stripe dashboard.'
};

describe('createSecretScanReport', () => {
  it('summarizes findings and unique rotation families', () => {
    const report = createSecretScanReport('/repo', [finding, { ...finding, id: 'two' }], []);

    expect(report.summary.total).toBe(2);
    expect(report.summary.bySource['git-history']).toBe(2);
    expect(report.summary.byConfidence.high).toBe(2);
    expect(report.rotationFamilies).toEqual(['Stripe secret key']);
  });
});
```

- [ ] **Step 2: Write failing remediation tests**

```typescript
import { describe, expect, it } from 'vitest';

import { createHistoryCleanupPlan, suggestIgnoreEntries } from './secret-remediation';
import type { SecretFinding } from './secret-types';

const finding: SecretFinding = {
  id: 'one',
  family: 'OpenAI API key',
  confidence: 'high',
  source: 'git-history',
  location: { path: '.env', line: 1, commit: 'abc1234' },
  redactedValue: 'sk-p...abcd',
  fingerprint: 'fingerprint',
  rotationGuidance: 'Rotate the OpenAI API key.'
};

describe('suggestIgnoreEntries', () => {
  it('suggests path entries for working-tree findings', () => {
    expect(suggestIgnoreEntries([{ ...finding, source: 'working-tree' }])).toEqual(['/.env']);
  });
});

describe('createHistoryCleanupPlan', () => {
  it('generates a preview-only path-based history rewrite command', () => {
    const plan = createHistoryCleanupPlan([finding]);

    expect(plan.rewritesHistory).toBe(true);
    expect(plan.affectedPaths).toEqual(['.env']);
    expect(plan.commands[0]).toContain("git filter-branch");
    expect(plan.warning).toContain('rewrites git history');
  });
});
```

- [ ] **Step 3: Run report/remediation tests and verify RED**

Run: `npm test -- --run src/secret-report.test.ts src/secret-remediation.test.ts`

Expected: FAIL because modules do not exist.

- [ ] **Step 4: Implement report and remediation helpers**

`createSecretScanReport(repositoryPath, findings, skipped)` must fill zero counts for all source and confidence keys. `suggestIgnoreEntries` must return unique root-relative entries for working-tree findings. `createHistoryCleanupPlan` must return preview commands only and must never include force-push commands.

Required command shape:

```typescript
git filter-branch --force --index-filter "git rm --cached --ignore-unmatch -- .env" --prune-empty --tag-name-filter cat -- --all
```

- [ ] **Step 5: Run report/remediation tests and verify GREEN**

Run: `npm test -- --run src/secret-report.test.ts src/secret-remediation.test.ts`

Expected: PASS.

- [ ] **Step 6: Commit Task 3**

```bash
git add src/secret-report.ts src/secret-report.test.ts src/secret-remediation.ts src/secret-remediation.test.ts
git commit -m "feat: summarize secret scan remediation"
```

## Task 4: Working Tree Scanner

**Files:**
- Create: `src/secret-scanner.ts`
- Create: `src/secret-scanner.test.ts`

- [ ] **Step 1: Write failing working-tree scanner tests**

```typescript
import { describe, expect, it } from 'vitest';

import { scanWorkingTree } from './secret-scanner';

describe('scanWorkingTree', () => {
  it('scans text files and skips ignored heavy directories', async () => {
    const files = new Map([
      ['.env', 'OPENAI_API_KEY=sk-proj-abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789'],
      ['node_modules/pkg/index.js', 'STRIPE_SECRET_KEY=sk_live_should_not_be_scanned'],
      ['dist/output.js', 'NPM_TOKEN=npm_should_not_be_scanned']
    ]);

    const findings = await scanWorkingTree('/repo', {
      listFiles: async () => [...files.keys()],
      readFile: async (path) => files.get(path) ?? ''
    });

    expect(findings).toHaveLength(1);
    expect(findings[0]).toMatchObject({
      family: 'OpenAI API key',
      source: 'working-tree',
      location: { path: '.env', line: 1 }
    });
    expect(findings[0].redactedValue).not.toContain('abcdefghijklmnopqrstuvwxyz');
  });
});
```

- [ ] **Step 2: Run scanner test and verify RED**

Run: `npm test -- --run src/secret-scanner.test.ts`

Expected: FAIL because `scanWorkingTree` does not exist.

- [ ] **Step 3: Implement working-tree scanner**

Implement `scanWorkingTree(repositoryPath, deps)` with injected `listFiles` and `readFile`, exclusion checks for `.git`, `node_modules`, `dist`, `*.vsix`, binary-like extensions, and max file size handling when a size is supplied by future deps. Convert each `SecretMatch` into a `SecretFinding` with redaction, fingerprint, source, location line number, and stable ID.

- [ ] **Step 4: Run scanner test and verify GREEN**

Run: `npm test -- --run src/secret-scanner.test.ts`

Expected: PASS.

- [ ] **Step 5: Commit Task 4**

```bash
git add src/secret-scanner.ts src/secret-scanner.test.ts
git commit -m "feat: scan working tree for secrets"
```

## Task 5: Git History Scanner

**Files:**
- Modify: `src/secret-scanner.ts`
- Modify: `src/secret-scanner.test.ts`

- [ ] **Step 1: Write failing git-history scanner tests**

Add:

```typescript
import { scanGitHistory } from './secret-scanner';

describe('scanGitHistory', () => {
  it('scans git object contents returned by injected git commands', async () => {
    const findings = await scanGitHistory('/repo', {
      runGit: async (args) => {
        if (args[0] === 'rev-list') {
          return 'abc123 .env\n';
        }

        if (args[0] === 'show') {
          return 'OPENAI_API_KEY=sk-proj-abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789\n';
        }

        return '';
      }
    });

    expect(findings).toHaveLength(1);
    expect(findings[0]).toMatchObject({
      source: 'git-history',
      location: { path: '.env', line: 1, commit: 'abc123' }
    });
  });
});
```

- [ ] **Step 2: Run git-history scanner test and verify RED**

Run: `npm test -- --run src/secret-scanner.test.ts`

Expected: FAIL because `scanGitHistory` is not implemented.

- [ ] **Step 3: Implement git-history scanner**

Implement `scanGitHistory(repositoryPath, deps)` with an injected `runGit(args: readonly string[])` dependency. Use `rev-list --objects --all` output lines as `<object> <path>`, skip excluded paths, read blob content with `show <object>`, cap blob content, and set `location.commit` to the object id for the first version. Convert matches with the same redaction and ID helper used by working-tree scanning.

- [ ] **Step 4: Run git-history scanner test and verify GREEN**

Run: `npm test -- --run src/secret-scanner.test.ts`

Expected: PASS.

- [ ] **Step 5: Commit Task 5**

```bash
git add src/secret-scanner.ts src/secret-scanner.test.ts
git commit -m "feat: scan git history for secrets"
```

## Task 6: Full Scan Orchestration

**Files:**
- Modify: `src/secret-scanner.ts`
- Modify: `src/secret-scanner.test.ts`

- [ ] **Step 1: Write failing full-scan test**

Add:

```typescript
import { scanRepositoryForSecrets } from './secret-scanner';

describe('scanRepositoryForSecrets', () => {
  it('combines working-tree and history findings into a report', async () => {
    const report = await scanRepositoryForSecrets('/repo', {
      listFiles: async () => ['.env'],
      readFile: async () => 'OPENAI_API_KEY=sk-proj-abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789',
      runGit: async (args) => (args[0] === 'rev-list' ? '' : '')
    });

    expect(report.repositoryPath).toBe('/repo');
    expect(report.summary.total).toBe(1);
    expect(report.rotationFamilies).toEqual(['OpenAI API key']);
  });
});
```

- [ ] **Step 2: Run full-scan test and verify RED**

Run: `npm test -- --run src/secret-scanner.test.ts`

Expected: FAIL because `scanRepositoryForSecrets` does not exist.

- [ ] **Step 3: Implement orchestration**

Implement `scanRepositoryForSecrets(repositoryPath, deps)` to run working-tree and history scans, tolerate git-history failures by adding a skipped message, and return `createSecretScanReport(repositoryPath, findings, skipped)`.

- [ ] **Step 4: Run full-scan test and verify GREEN**

Run: `npm test -- --run src/secret-scanner.test.ts`

Expected: PASS.

- [ ] **Step 5: Commit Task 6**

```bash
git add src/secret-scanner.ts src/secret-scanner.test.ts
git commit -m "feat: build secret scan reports"
```

## Task 7: VS Code Webview and Command

**Files:**
- Create: `src/secret-checker-webview.ts`
- Modify: `src/extension.ts`
- Modify: `package.json`

- [ ] **Step 1: Write command contribution before implementation**

Modify `package.json` commands:

```json
{
  "command": "ignoreKit.checkSecrets",
  "title": "Check Repository for Exposed Secrets",
  "category": "IgnoreKit"
}
```

- [ ] **Step 2: Implement webview controller**

Create `openSecretCheckerWebview(context, workspaceFolder)` and render a nonce-protected webview with:

- Header, scan button, and status.
- Summary counts.
- Findings table.
- Selected finding detail.
- Rotation guidance list.
- Remediation command previews.

Message types:

```typescript
type SecretCheckerMessage =
  | { readonly type: 'scan' }
  | { readonly type: 'copy'; readonly text: string }
  | { readonly type: 'confirmRunHistoryCleanup'; readonly command: string };
```

Use `vscode.env.clipboard.writeText` for copy. For confirmed history cleanup, show `vscode.window.showWarningMessage` with a modal confirmation and do not include force-push commands.

- [ ] **Step 3: Wire command in `extension.ts`**

Register `ignoreKit.checkSecrets`. Resolve the selected workspace folder or active workspace folder. If multiple folders exist and no selected resource resolves a folder, use `showQuickPick`.

- [ ] **Step 4: Run typecheck to catch VS Code API mistakes**

Run: `npm run check-types`

Expected: PASS.

- [ ] **Step 5: Commit Task 7**

```bash
git add package.json src/extension.ts src/secret-checker-webview.ts
git commit -m "feat: add secret checker webview"
```

## Task 8: Documentation and Final Verification

**Files:**
- Modify: `README.md`

- [ ] **Step 1: Update README**

Add a `Secret Checker` section documenting:

- Local-only scanning.
- Working-tree and git-history checks.
- Redacted findings.
- Rotation report.
- History cleanup command previews.
- No automatic force-push or remote mutation.

- [ ] **Step 2: Run full validation**

Run:

```bash
npm run lint
npm test -- --run
npm run compile
```

Expected: all commands exit 0.

- [ ] **Step 3: Inspect git status**

Run: `git status --short`

Expected: only intentional files are changed, or clean after commits.

- [ ] **Step 4: Commit docs if changed after Task 7**

```bash
git add README.md
git commit -m "docs: document secret checker"
```

## Self-Review

- Spec coverage: scanner, redaction, report, remediation previews, webview, command contribution, docs, and validation are covered.
- Scope: external tools, force-push, provider API rotation, and remote mutation remain excluded.
- TDD: every pure behavior module starts with failing tests before implementation. VS Code API wiring is verified by TypeScript and compile checks because extension-host UI tests are outside this repo's current setup.
- Risk controls: history cleanup remains previewed and confirmation-gated; reports use redacted values and fingerprints.
