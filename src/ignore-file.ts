const sectionStart = '# IgnoreKit';
const sectionDescription = '# Added from VS Code Explorer';
const sectionEnd = '# End IgnoreKit';

export type ResourceKind = 'file' | 'directory';

export interface IgnoreFileUpdate {
  readonly changed: boolean;
  readonly content: string;
}

export function createIgnoreEntry(
  targetRootPath: string,
  resourcePath: string,
  resourceKind: ResourceKind
): string {
  const targetRoot = stripTrailingSlash(toPosixPath(targetRootPath));
  const resource = stripTrailingSlash(toPosixPath(resourcePath));

  if (!isSamePathOrChild(targetRoot, resource)) {
    throw new Error('Selected resource is outside the ignore file root.');
  }

  const relativePath = resource.slice(targetRoot.length).replace(/^\/+/, '');

  if (!relativePath) {
    throw new Error('Cannot add the ignore file root to itself.');
  }

  const isRootResource = !relativePath.includes('/');
  const prefix = isRootResource ? '/' : '';
  const suffix = resourceKind === 'directory' ? '/' : '';

  return `${prefix}${relativePath}${suffix}`;
}

export function addEntryToIgnoreFile(existingContent: string, entry: string): IgnoreFileUpdate {
  const eol = detectEol(existingContent);
  const normalizedContent = normalizeFinalNewline(existingContent, eol);
  const lines = splitLines(normalizedContent);
  const startIndex = lines.indexOf(sectionStart);
  const endIndex = lines.indexOf(sectionEnd);

  if (startIndex === -1 || endIndex === -1 || endIndex < startIndex) {
    const contentBeforeSection = normalizedContent.length > 0 ? `${normalizedContent}${eol}` : '';

    return {
      changed: true,
      content:
        contentBeforeSection +
        [sectionStart, sectionDescription, entry, sectionEnd].join(eol) +
        eol
    };
  }

  const managedEntries = lines.slice(startIndex + 1, endIndex);

  if (managedEntries.includes(entry)) {
    return {
      changed: false,
      content: existingContent
    };
  }

  const updatedLines = [
    ...lines.slice(0, endIndex),
    entry,
    ...lines.slice(endIndex)
  ];

  return {
    changed: true,
    content: `${updatedLines.join(eol)}${eol}`
  };
}

export function removeEntryFromIgnoreFile(existingContent: string, entry: string): IgnoreFileUpdate {
  const eol = detectEol(existingContent);
  const lines = splitLines(existingContent);
  const startIndex = lines.indexOf(sectionStart);
  const endIndex = lines.indexOf(sectionEnd);

  if (startIndex === -1 || endIndex === -1 || endIndex < startIndex) {
    return {
      changed: false,
      content: existingContent
    };
  }

  const managedEntries = lines.slice(startIndex + 1, endIndex);
  const entryIndex = managedEntries.indexOf(entry);

  if (entryIndex === -1) {
    return {
      changed: false,
      content: existingContent
    };
  }

  const absoluteEntryIndex = startIndex + 1 + entryIndex;
  const updatedLines = [
    ...lines.slice(0, absoluteEntryIndex),
    ...lines.slice(absoluteEntryIndex + 1)
  ];

  return {
    changed: true,
    content: `${updatedLines.join(eol)}${eol}`
  };
}

export function toPosixPath(filePath: string): string {
  return filePath.replace(/\\/g, '/');
}

export function stripTrailingSlash(filePath: string): string {
  return filePath.replace(/\/+$/u, '');
}

export function isSamePathOrChild(parentPath: string, childPath: string): boolean {
  const comparisonParent = isWindowsPath(parentPath) ? parentPath.toLowerCase() : parentPath;
  const comparisonChild = isWindowsPath(childPath) ? childPath.toLowerCase() : childPath;

  return comparisonChild === comparisonParent || comparisonChild.startsWith(`${comparisonParent}/`);
}

function isWindowsPath(filePath: string): boolean {
  return /^[a-z]:\//iu.test(filePath);
}

function detectEol(content: string): '\n' | '\r\n' {
  return content.includes('\r\n') ? '\r\n' : '\n';
}

function normalizeFinalNewline(content: string, eol: string): string {
  if (content.length === 0 || content.endsWith('\n')) {
    return content;
  }

  return `${content}${eol}`;
}

function splitLines(content: string): string[] {
  if (content.length === 0) {
    return [];
  }

  return content.replace(/\r?\n$/u, '').split(/\r?\n/u);
}
