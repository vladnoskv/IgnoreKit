import { isSamePathOrChild, stripTrailingSlash, toPosixPath } from './ignore-file';
import type { ResourceKind } from './ignore-file';
import { detectFrameworks } from './frameworks';

export type IgnoreTargetKind = 'git' | 'npm' | 'vscode' | 'docker' | 'eslint' | 'prettier' | 'stylelint' | 'helm' | 'cf' | 'terraform' | 'serverless' | 'babel' | 'eleventy' | 'vercel' | 'slug' | 'func';
export type PackageManager = 'bun' | 'pnpm' | 'yarn' | 'npm' | 'package';

export interface IgnoreTarget {
  readonly kind: IgnoreTargetKind;
  readonly label: string;
  readonly fileName: string;
  readonly rootPath: string;
  readonly canCreate: boolean;
}

export interface ResolveIgnoreTargetsInput {
  readonly workspacePath: string;
  readonly resourcePath: string;
  readonly resourceKind?: ResourceKind;
  readonly directoryEntries: ReadonlyMap<string, ReadonlySet<string>>;
}

export function resolveIgnoreTargets(input: ResolveIgnoreTargetsInput): IgnoreTarget[] {
  const workspacePath = stripTrailingSlash(toPosixPath(input.workspacePath));
  const resourcePath = stripTrailingSlash(toPosixPath(input.resourcePath));

  if (!isSamePathOrChild(workspacePath, resourcePath)) {
    throw new Error('Selected resource is outside the workspace folder.');
  }

  const targets: IgnoreTarget[] = [
    {
      kind: 'git',
      label: '.gitignore',
      fileName: '.gitignore',
      rootPath: workspacePath,
      canCreate: true
    }
  ];

  const frameworks = detectFrameworks(
    workspacePath,
    resourcePath,
    input.resourceKind ?? 'file',
    input.directoryEntries
  );

  for (const framework of frameworks) {
    const kind = mapConfigToKind(framework.config.ignoreFileName);
    let label = framework.config.ignoreFileName;

    if (framework.config.ignoreFileName === '.npmignore' || framework.config.ignoreFileName === '.vscodeignore') {
      const entries = input.directoryEntries.get(framework.rootPath);
      const pm = entries ? detectPackageManager(entries) : 'package';
      label = `${framework.config.ignoreFileName} (${pm} package)`;
    } else {
      label = `${framework.config.ignoreFileName} (${framework.config.label})`;
    }

    targets.push({
      kind,
      label,
      fileName: framework.config.ignoreFileName,
      rootPath: framework.rootPath,
      canCreate: framework.config.canCreate
    });
  }

  return targets;
}

function mapConfigToKind(ignoreFileName: string): IgnoreTargetKind {
  switch (ignoreFileName) {
    case '.npmignore': return 'npm';
    case '.vscodeignore': return 'vscode';
    case '.dockerignore': return 'docker';
    case '.eslintignore': return 'eslint';
    case '.prettierignore': return 'prettier';
    case '.stylelintignore': return 'stylelint';
    case '.helmignore': return 'helm';
    case '.cfignore': return 'cf';
    case '.terraformignore': return 'terraform';
    case '.serverlessignore': return 'serverless';
    case '.babelignore': return 'babel';
    case '.eleventyignore': return 'eleventy';
    case '.vercelignore': return 'vercel';
    case '.slugignore': return 'slug';
    case '.funcignore': return 'func';
    default: return 'git';
  }
}

export function detectPackageManager(entries: ReadonlySet<string>): PackageManager {
  if (entries.has('bun.lock') || entries.has('bun.lockb')) {
    return 'bun';
  }

  if (entries.has('pnpm-lock.yaml')) {
    return 'pnpm';
  }

  if (entries.has('yarn.lock')) {
    return 'yarn';
  }

  if (entries.has('package-lock.json')) {
    return 'npm';
  }

  return 'package';
}
