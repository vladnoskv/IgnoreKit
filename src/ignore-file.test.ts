import { describe, expect, it } from 'vitest';

import { addEntryToIgnoreFile, createIgnoreEntry, removeEntryFromIgnoreFile } from './ignore-file';

describe('createIgnoreEntry', () => {
  it('creates a POSIX relative path for a selected file', () => {
    expect(createIgnoreEntry('C:\\repo', 'C:\\repo\\logs\\debug.log', 'file')).toBe('logs/debug.log');
  });

  it('adds a trailing slash for selected folders', () => {
    expect(createIgnoreEntry('/repo', '/repo/build/output', 'directory')).toBe('build/output/');
  });

  it('uses a leading slash for resources directly inside the target root', () => {
    expect(createIgnoreEntry('/repo', '/repo/.env', 'file')).toBe('/.env');
  });

  it('uses paths relative to the selected ignore target root', () => {
    expect(createIgnoreEntry('/repo/packages/app', '/repo/packages/app/dist/index.js', 'file')).toBe('dist/index.js');
  });

  it('rejects resources outside the target root', () => {
    expect(() => createIgnoreEntry('/repo/packages/app', '/repo/packages/other/dist', 'directory')).toThrow(
      'Selected resource is outside the ignore file root.'
    );
  });
});

describe('addEntryToIgnoreFile', () => {
  it('creates a managed section when none exists', () => {
    const result = addEntryToIgnoreFile('', 'dist/');

    expect(result.changed).toBe(true);
    expect(result.content).toBe(
      '# IgnoreKit\n' +
        '# Added from VS Code Explorer\n' +
        'dist/\n' +
        '# End IgnoreKit\n'
    );
  });

  it('preserves existing ignore content outside the managed section', () => {
    const result = addEntryToIgnoreFile('node_modules/\n.env\n', 'dist/');

    expect(result.changed).toBe(true);
    expect(result.content).toBe(
      'node_modules/\n' +
        '.env\n' +
        '\n' +
        '# IgnoreKit\n' +
        '# Added from VS Code Explorer\n' +
        'dist/\n' +
        '# End IgnoreKit\n'
    );
  });

  it('appends to an existing managed section', () => {
    const original =
      '# IgnoreKit\n' +
      '# Added from VS Code Explorer\n' +
      'dist/\n' +
      '# End IgnoreKit\n';

    const result = addEntryToIgnoreFile(original, 'coverage/');

    expect(result.changed).toBe(true);
    expect(result.content).toBe(
      '# IgnoreKit\n' +
        '# Added from VS Code Explorer\n' +
        'dist/\n' +
        'coverage/\n' +
        '# End IgnoreKit\n'
    );
  });

  it('does not add duplicates to the managed section', () => {
    const original =
      '# IgnoreKit\n' +
      '# Added from VS Code Explorer\n' +
      'dist/\n' +
      '# End IgnoreKit\n';

    const result = addEntryToIgnoreFile(original, 'dist/');

    expect(result.changed).toBe(false);
    expect(result.content).toBe(original);
  });
});

describe('removeEntryFromIgnoreFile', () => {
  it('removes an entry from the managed section', () => {
    const original =
      '# IgnoreKit\n' +
      '# Added from VS Code Explorer\n' +
      'dist/\n' +
      'coverage/\n' +
      '# End IgnoreKit\n';

    const result = removeEntryFromIgnoreFile(original, 'dist/');

    expect(result.changed).toBe(true);
    expect(result.content).toBe(
      '# IgnoreKit\n' +
        '# Added from VS Code Explorer\n' +
        'coverage/\n' +
        '# End IgnoreKit\n'
    );
  });

  it('does not change content when the entry is not in the managed section', () => {
    const original =
      'dist/\n' +
      '\n' +
      '# IgnoreKit\n' +
      '# Added from VS Code Explorer\n' +
      'coverage/\n' +
      '# End IgnoreKit\n';

    const result = removeEntryFromIgnoreFile(original, 'dist/');

    expect(result.changed).toBe(false);
    expect(result.content).toBe(original);
  });

  it('keeps an empty managed section after removing the final entry', () => {
    const original =
      '# IgnoreKit\n' +
      '# Added from VS Code Explorer\n' +
      'dist/\n' +
      '# End IgnoreKit\n';

    const result = removeEntryFromIgnoreFile(original, 'dist/');

    expect(result.changed).toBe(true);
    expect(result.content).toBe(
      '# IgnoreKit\n' +
        '# Added from VS Code Explorer\n' +
        '# End IgnoreKit\n'
    );
  });
});
