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

  it('rejects resources inside node_modules', () => {
    expect(() =>
      resolveIgnoreTargets({
        workspacePath,
        resourcePath: '/repo/node_modules/pkg/index.js',
        directoryEntries: new Map()
      })
    ).toThrow('IgnoreKit does not update ignore files for resources inside node_modules.');
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
