import { describe, expect, it } from 'vitest';

import { detectFrameworks } from './frameworks';

const workspacePath = '/repo';

describe('detectFrameworks', () => {
  it('detects no frameworks when no config files are present', () => {
    const frameworks = detectFrameworks(
      workspacePath,
      '/repo/src/index.ts',
      'file',
      new Map([
        ['/repo/src', new Set(['index.ts'])]
      ])
    );

    expect(frameworks).toEqual([]);
  });

  it('detects Docker when a Dockerfile exists at the workspace root', () => {
    const frameworks = detectFrameworks(
      workspacePath,
      '/repo/src/index.ts',
      'file',
      new Map([
        ['/repo/src', new Set(['index.ts'])],
        ['/repo', new Set(['Dockerfile', '.dockerignore'])]
      ])
    );

    expect(frameworks).toEqual([
      {
        config: expect.objectContaining({ ignoreFileName: '.dockerignore', label: 'Docker' }),
        rootPath: '/repo',
        ignoreFileExists: true
      }
    ]);
  });

  it('detects Docker and offers to create .dockerignore even when it does not exist', () => {
    const frameworks = detectFrameworks(
      workspacePath,
      '/repo/src/index.ts',
      'file',
      new Map([
        ['/repo/src', new Set(['index.ts'])],
        ['/repo', new Set(['Dockerfile'])]
      ])
    );

    expect(frameworks).toEqual([
      {
        config: expect.objectContaining({ ignoreFileName: '.dockerignore', label: 'Docker', canCreate: true }),
        rootPath: '/repo',
        ignoreFileExists: false
      }
    ]);
  });

  it('detects ESLint when eslint config exists', () => {
    const frameworks = detectFrameworks(
      workspacePath,
      '/repo/src/index.ts',
      'file',
      new Map([
        ['/repo/src', new Set(['index.ts'])],
        ['/repo', new Set(['.eslintrc.json', '.eslintignore'])]
      ])
    );

    expect(frameworks).toEqual([
      {
        config: expect.objectContaining({ ignoreFileName: '.eslintignore', label: 'ESLint' }),
        rootPath: '/repo',
        ignoreFileExists: true
      }
    ]);
  });

  it('detects Prettier when prettier config exists', () => {
    const frameworks = detectFrameworks(
      workspacePath,
      '/repo/src/index.ts',
      'file',
      new Map([
        ['/repo', new Set(['.prettierrc', '.prettierignore'])]
      ])
    );

    expect(frameworks).toEqual([
      {
        config: expect.objectContaining({ ignoreFileName: '.prettierignore', label: 'Prettier' }),
        rootPath: '/repo',
        ignoreFileExists: true
      }
    ]);
  });

  it('detects multiple frameworks at different levels', () => {
    const frameworks = detectFrameworks(
      workspacePath,
      '/repo/packages/app/src/index.ts',
      'file',
      new Map([
        ['/repo/packages/app/src', new Set(['index.ts'])],
        ['/repo/packages/app', new Set(['package.json', '.npmignore'])],
        ['/repo', new Set(['Dockerfile', '.dockerignore'])]
      ])
    );

    expect(frameworks).toHaveLength(2);
    expect(frameworks[0].config.ignoreFileName).toBe('.npmignore');
    expect(frameworks[0].rootPath).toBe('/repo/packages/app');
    expect(frameworks[1].config.ignoreFileName).toBe('.dockerignore');
    expect(frameworks[1].rootPath).toBe('/repo');
  });

  it('only detects the nearest occurrence of each framework type', () => {
    const frameworks = detectFrameworks(
      workspacePath,
      '/repo/packages/app/src/index.ts',
      'file',
      new Map([
        ['/repo/packages/app', new Set(['package.json', '.npmignore'])],
        ['/repo/packages', new Set(['package.json', '.npmignore'])],
        ['/repo', new Set(['package.json'])]
      ])
    );

    expect(frameworks).toHaveLength(1);
    expect(frameworks[0].rootPath).toBe('/repo/packages/app');
  });

  it('does not offer helmignore when Chart.yaml exists but helmignore does not', () => {
    const frameworks = detectFrameworks(
      workspacePath,
      '/repo/chart/values.yaml',
      'file',
      new Map([
        ['/repo/chart', new Set(['Chart.yaml', 'values.yaml'])]
      ])
    );

    expect(frameworks).toEqual([]);
  });

  it('offers helmignore when Chart.yaml and .helmignore both exist', () => {
    const frameworks = detectFrameworks(
      workspacePath,
      '/repo/chart/values.yaml',
      'file',
      new Map([
        ['/repo/chart', new Set(['Chart.yaml', '.helmignore', 'values.yaml'])]
      ])
    );

    expect(frameworks).toHaveLength(1);
    expect(frameworks[0].config.ignoreFileName).toBe('.helmignore');
  });

  it('detects frameworks when the selected resource is a directory', () => {
    const frameworks = detectFrameworks(
      workspacePath,
      '/repo/docker',
      'directory',
      new Map([
        ['/repo/docker', new Set(['Dockerfile'])]
      ])
    );

    expect(frameworks).toEqual([
      {
        config: expect.objectContaining({ ignoreFileName: '.dockerignore', label: 'Docker', canCreate: true }),
        rootPath: '/repo/docker',
        ignoreFileExists: false
      }
    ]);
  });

  it('detects frameworks when config is in the resource directory itself', () => {
    const frameworks = detectFrameworks(
      workspacePath,
      '/repo/src',
      'directory',
      new Map([
        ['/repo/src', new Set(['.eslintrc.json'])]
      ])
    );

    expect(frameworks).toEqual([
      {
        config: expect.objectContaining({ ignoreFileName: '.eslintignore', label: 'ESLint', canCreate: true }),
        rootPath: '/repo/src',
        ignoreFileExists: false
      }
    ]);
  });
});
