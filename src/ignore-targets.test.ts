import { describe, expect, it } from 'vitest';

import { detectPackageManager, resolveIgnoreTargets } from './ignore-targets';

const workspacePath = '/repo';

describe('resolveIgnoreTargets', () => {
  it('always offers the workspace gitignore target and allows creating it', () => {
    const targets = resolveIgnoreTargets({
      workspacePath,
      resourcePath: '/repo/src/index.ts',
      directoryEntries: new Map()
    });

    expect(targets).toEqual([
      {
        kind: 'git',
        label: '.gitignore',
        fileName: '.gitignore',
        rootPath: '/repo',
        canCreate: true
      }
    ]);
  });

  it('offers npmignore and vscodeignore only when they exist in the nearest package root', () => {
    const targets = resolveIgnoreTargets({
      workspacePath,
      resourcePath: '/repo/packages/app/src/index.ts',
      directoryEntries: new Map([
        ['/repo/packages/app', new Set(['package.json', '.npmignore', '.vscodeignore', 'package-lock.json'])],
        ['/repo/packages', new Set(['package.json', '.npmignore'])]
      ])
    });

    expect(targets).toEqual([
      {
        kind: 'git',
        label: '.gitignore',
        fileName: '.gitignore',
        rootPath: '/repo',
        canCreate: true
      },
      {
        kind: 'npm',
        label: '.npmignore (npm package)',
        fileName: '.npmignore',
        rootPath: '/repo/packages/app',
        canCreate: false
      },
      {
        kind: 'vscode',
        label: '.vscodeignore (npm package)',
        fileName: '.vscodeignore',
        rootPath: '/repo/packages/app',
        canCreate: false
      }
    ]);
  });

  it('detects package ignore files when the selected resource is the package folder itself', () => {
    const targets = resolveIgnoreTargets({
      workspacePath,
      resourcePath: '/repo/packages/app',
      resourceKind: 'directory',
      directoryEntries: new Map([
        ['/repo/packages/app', new Set(['package.json', '.npmignore'])]
      ])
    });

    expect(targets.map((target) => target.fileName)).toEqual(['.gitignore', '.npmignore']);
  });

  it('does not offer package ignore files when the nearest package root does not contain them', () => {
    const targets = resolveIgnoreTargets({
      workspacePath,
      resourcePath: '/repo/packages/app/src/index.ts',
      directoryEntries: new Map([
        ['/repo/packages/app', new Set(['package.json'])],
        ['/repo/packages', new Set(['package.json', '.npmignore', '.vscodeignore'])]
      ])
    });

    expect(targets.map((target) => target.fileName)).toEqual(['.gitignore']);
  });

  it('allows resources inside node_modules', () => {
    const targets = resolveIgnoreTargets({
      workspacePath,
      resourcePath: '/repo/node_modules/pkg/index.js',
      directoryEntries: new Map()
    });

    expect(targets.map((t) => t.fileName)).toEqual(['.gitignore']);
  });

  it('offers .dockerignore when a Dockerfile exists and dockerignore is present', () => {
    const targets = resolveIgnoreTargets({
      workspacePath,
      resourcePath: '/repo/src/index.ts',
      directoryEntries: new Map([
        ['/repo/src', new Set(['index.ts'])],
        ['/repo', new Set(['Dockerfile', '.dockerignore'])]
      ])
    });

    expect(targets.map((t) => t.fileName)).toEqual(['.gitignore', '.dockerignore']);
    expect(targets[1].label).toBe('.dockerignore (Docker)');
    expect(targets[1].canCreate).toBe(true);
  });

  it('offers to create .dockerignore when Dockerfile exists but dockerignore does not', () => {
    const targets = resolveIgnoreTargets({
      workspacePath,
      resourcePath: '/repo/src/index.ts',
      directoryEntries: new Map([
        ['/repo/src', new Set(['index.ts'])],
        ['/repo', new Set(['Dockerfile'])]
      ])
    });

    expect(targets.map((t) => t.fileName)).toEqual(['.gitignore', '.dockerignore']);
    expect(targets[1].label).toBe('.dockerignore (Docker)');
    expect(targets[1].canCreate).toBe(true);
  });

  it('offers .eslintignore and .prettierignore alongside gitignore', () => {
    const targets = resolveIgnoreTargets({
      workspacePath,
      resourcePath: '/repo/src/index.ts',
      directoryEntries: new Map([
        ['/repo/src', new Set(['index.ts'])],
        ['/repo', new Set(['.eslintrc.json', '.eslintignore', '.prettierrc', '.prettierignore'])]
      ])
    });

    const fileNames = targets.map((t) => t.fileName);
    expect(fileNames).toContain('.gitignore');
    expect(fileNames).toContain('.eslintignore');
    expect(fileNames).toContain('.prettierignore');
  });

  it('does not offer .helmignore when Chart.yaml exists but helmignore is absent', () => {
    const targets = resolveIgnoreTargets({
      workspacePath,
      resourcePath: '/repo/chart/templates/deployment.yaml',
      directoryEntries: new Map([
        ['/repo/chart/templates', new Set(['deployment.yaml'])],
        ['/repo/chart', new Set(['Chart.yaml', 'values.yaml'])]
      ])
    });

    expect(targets.map((t) => t.fileName)).toEqual(['.gitignore']);
  });

  it('offers .helmignore when Chart.yaml and .helmignore both exist', () => {
    const targets = resolveIgnoreTargets({
      workspacePath,
      resourcePath: '/repo/chart/templates/deployment.yaml',
      directoryEntries: new Map([
        ['/repo/chart/templates', new Set(['deployment.yaml'])],
        ['/repo/chart', new Set(['Chart.yaml', '.helmignore', 'values.yaml'])]
      ])
    });

    expect(targets.map((t) => t.fileName)).toEqual(['.gitignore', '.helmignore']);
    expect(targets[1].label).toBe('.helmignore (Helm)');
    expect(targets[1].canCreate).toBe(false);
  });

  it('offers multiple ignore files when both npm and Docker configs exist', () => {
    const targets = resolveIgnoreTargets({
      workspacePath,
      resourcePath: '/repo/packages/app/src/index.ts',
      directoryEntries: new Map([
        ['/repo/packages/app/src', new Set(['index.ts'])],
        ['/repo/packages/app', new Set(['package.json', '.npmignore'])],
        ['/repo', new Set(['Dockerfile', '.dockerignore'])]
      ])
    });

    const fileNames = targets.map((t) => t.fileName);
    expect(fileNames).toEqual(['.gitignore', '.npmignore', '.dockerignore']);
  });
});

describe('detectPackageManager', () => {
  it('detects Bun before other package managers', () => {
    expect(detectPackageManager(new Set(['package.json', 'bun.lock', 'package-lock.json']))).toBe('bun');
  });

  it('detects pnpm, yarn, npm, and unknown packages', () => {
    expect(detectPackageManager(new Set(['package.json', 'pnpm-lock.yaml']))).toBe('pnpm');
    expect(detectPackageManager(new Set(['package.json', 'yarn.lock']))).toBe('yarn');
    expect(detectPackageManager(new Set(['package.json', 'package-lock.json']))).toBe('npm');
    expect(detectPackageManager(new Set(['package.json']))).toBe('package');
  });
});
