import { isSamePathOrChild, stripTrailingSlash, toPosixPath } from './ignore-file';
import type { ResourceKind } from './ignore-file';

export type IgnoreTargetKind = 'git' | 'npm' | 'vscode';
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

  if (isInsideNodeModules(workspacePath, resourcePath)) {
    throw new Error('IgnoreKit does not update ignore files for resources inside node_modules.');
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

  const packageRoot = findNearestPackageRoot(
    workspacePath,
    resourcePath,
    input.resourceKind ?? 'file',
    input.directoryEntries
  );

  if (!packageRoot) {
    return targets;
  }

  const entries = input.directoryEntries.get(packageRoot);

  if (!entries) {
    return targets;
  }

  const packageManager = detectPackageManager(entries);
  const suffix = ` (${packageManager} package)`;

  if (entries.has('.npmignore')) {
    targets.push({
      kind: 'npm',
      label: `.npmignore${suffix}`,
      fileName: '.npmignore',
      rootPath: packageRoot,
      canCreate: false
    });
  }

  if (entries.has('.vscodeignore')) {
    targets.push({
      kind: 'vscode',
      label: `.vscodeignore${suffix}`,
      fileName: '.vscodeignore',
      rootPath: packageRoot,
      canCreate: false
    });
  }

  return targets;
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

function findNearestPackageRoot(
  workspacePath: string,
  resourcePath: string,
  resourceKind: ResourceKind,
  directoryEntries: ReadonlyMap<string, ReadonlySet<string>>
): string | undefined {
  let currentPath = resourceKind === 'directory' ? resourcePath : getDirectoryPath(resourcePath);

  while (isSamePathOrChild(workspacePath, currentPath)) {
    const entries = directoryEntries.get(currentPath);

    if (entries?.has('package.json')) {
      return currentPath;
    }

    if (currentPath === workspacePath) {
      break;
    }

    currentPath = getDirectoryPath(currentPath);
  }

  return undefined;
}

function isInsideNodeModules(workspacePath: string, resourcePath: string): boolean {
  const relativePath = resourcePath.slice(workspacePath.length).replace(/^\/+/, '');
  return relativePath.split('/').includes('node_modules');
}

function getDirectoryPath(filePath: string): string {
  const normalizedPath = stripTrailingSlash(filePath);
  const lastSlashIndex = normalizedPath.lastIndexOf('/');

  if (lastSlashIndex <= 0) {
    return normalizedPath;
  }

  return normalizedPath.slice(0, lastSlashIndex);
}
