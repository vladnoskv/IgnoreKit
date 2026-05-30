import * as vscode from 'vscode';

import {
  addEntryToIgnoreFile,
  createIgnoreEntry,
  removeEntryFromIgnoreFile,
  stripTrailingSlash,
  toPosixPath,
  type ResourceKind
} from './ignore-file';
import { resolveIgnoreTargets, type IgnoreTarget } from './ignore-targets';

const addCommandId = 'ignoreKit.addToIgnoreFile';
const removeCommandId = 'ignoreKit.removeFromIgnoreFile';
type IgnoreAction = 'add' | 'remove';

export function activate(context: vscode.ExtensionContext): void {
  context.subscriptions.push(
    vscode.commands.registerCommand(addCommandId, async (selectedResource?: vscode.Uri) => {
      await updateSelectedResourceInIgnoreFile('add', selectedResource);
    }),
    vscode.commands.registerCommand(removeCommandId, async (selectedResource?: vscode.Uri) => {
      await updateSelectedResourceInIgnoreFile('remove', selectedResource);
    })
  );
}

export function deactivate(): void {
  // No resources require explicit disposal.
}

async function updateSelectedResourceInIgnoreFile(action: IgnoreAction, selectedResource?: vscode.Uri): Promise<void> {
  const resource = selectedResource ?? vscode.window.activeTextEditor?.document.uri;

  if (!resource || resource.scheme !== 'file') {
    vscode.window.showErrorMessage('Select a file or folder in the Explorer to update an ignore file.');
    return;
  }

  const workspaceFolder = vscode.workspace.getWorkspaceFolder(resource);

  if (!workspaceFolder) {
    vscode.window.showErrorMessage('Selected resource is not inside an open workspace folder.');
    return;
  }

  try {
    const stat = await vscode.workspace.fs.stat(resource);
    const resourceKind = getResourceKind(stat);
    const directoryEntries = await collectDirectoryEntries(workspaceFolder.uri, resource, resourceKind);
    const targets = resolveIgnoreTargets({
      workspacePath: workspaceFolder.uri.fsPath,
      resourcePath: resource.fsPath,
      resourceKind,
      directoryEntries
    });
    const target = await selectIgnoreTarget(action, targets);

    if (!target) {
      return;
    }

    const entry = createIgnoreEntry(target.rootPath, resource.fsPath, resourceKind);
    const ignoreFileUri = vscode.Uri.joinPath(vscode.Uri.file(target.rootPath), target.fileName);
    const existingContent = await readTextFileIfExists(ignoreFileUri, action === 'add' && target.canCreate);
    const update =
      action === 'add'
        ? addEntryToIgnoreFile(existingContent, entry)
        : removeEntryFromIgnoreFile(existingContent, entry);

    if (!update.changed) {
      const message =
        action === 'add'
          ? `Already in ${target.fileName}: ${entry}`
          : `Not found in IgnoreKit section of ${target.fileName}: ${entry}`;
      vscode.window.showInformationMessage(message);
      return;
    }

    await vscode.workspace.fs.writeFile(ignoreFileUri, new TextEncoder().encode(update.content));
    const message =
      action === 'add'
        ? `Added to ${target.fileName}: ${entry}`
        : `Removed from ${target.fileName}: ${entry}`;
    vscode.window.showInformationMessage(message);
  } catch (error) {
    vscode.window.showErrorMessage(getErrorMessage(error));
  }
}

function getResourceKind(stat: vscode.FileStat): ResourceKind {
  return (stat.type & vscode.FileType.Directory) !== 0 ? 'directory' : 'file';
}

async function collectDirectoryEntries(
  workspaceUri: vscode.Uri,
  resourceUri: vscode.Uri,
  resourceKind: ResourceKind
): Promise<Map<string, ReadonlySet<string>>> {
  const workspacePath = stripTrailingSlash(toPosixPath(workspaceUri.fsPath));
  const resourcePath = stripTrailingSlash(toPosixPath(resourceUri.fsPath));

  if (isInsideNodeModules(workspacePath, resourcePath)) {
    throw new Error('IgnoreKit does not update ignore files for resources inside node_modules.');
  }

  const entriesByDirectory = new Map<string, ReadonlySet<string>>();
  let currentUri = resourceKind === 'directory' ? resourceUri : vscode.Uri.joinPath(resourceUri, '..');

  while (isSamePathOrChild(workspacePath, currentUri.fsPath)) {
    const entries = await vscode.workspace.fs.readDirectory(currentUri);
    entriesByDirectory.set(
      stripTrailingSlash(toPosixPath(currentUri.fsPath)),
      new Set(entries.map(([name]) => name))
    );

    const currentPath = stripTrailingSlash(toPosixPath(currentUri.fsPath));

    if (currentPath === workspacePath) {
      break;
    }

    currentUri = vscode.Uri.joinPath(currentUri, '..');
  }

  return entriesByDirectory;
}

async function selectIgnoreTarget(
  action: IgnoreAction,
  targets: readonly IgnoreTarget[]
): Promise<IgnoreTarget | undefined> {
  if (targets.length === 1) {
    return targets[0];
  }

  const selected = await vscode.window.showQuickPick(
    targets.map((target) => ({
      label: target.label,
      description: target.rootPath,
      target
    })),
    {
      title: action === 'add' ? 'Add to Ignore File' : 'Remove from Ignore File',
      placeHolder: 'Choose which ignore file to update'
    }
  );

  return selected?.target;
}

async function readTextFileIfExists(uri: vscode.Uri, allowMissing: boolean): Promise<string> {
  try {
    const content = await vscode.workspace.fs.readFile(uri);
    return new TextDecoder('utf-8').decode(content);
  } catch (error) {
    if (allowMissing && isFileNotFound(error)) {
      return '';
    }

    throw error;
  }
}

function isInsideNodeModules(workspacePath: string, resourcePath: string): boolean {
  const relativePath = stripTrailingSlash(toPosixPath(resourcePath))
    .slice(stripTrailingSlash(toPosixPath(workspacePath)).length)
    .replace(/^\/+/, '');

  return relativePath.split('/').includes('node_modules');
}

function isSamePathOrChild(parentPath: string, childPath: string): boolean {
  const parent = stripTrailingSlash(toPosixPath(parentPath));
  const child = stripTrailingSlash(toPosixPath(childPath));
  const comparisonParent = isWindowsPath(parent) ? parent.toLowerCase() : parent;
  const comparisonChild = isWindowsPath(child) ? child.toLowerCase() : child;

  return comparisonChild === comparisonParent || comparisonChild.startsWith(`${comparisonParent}/`);
}

function isWindowsPath(filePath: string): boolean {
  return /^[a-z]:\//iu.test(filePath);
}

function isFileNotFound(error: unknown): boolean {
  return typeof error === 'object' && error !== null && 'code' in error && error.code === 'FileNotFound';
}

function getErrorMessage(error: unknown): string {
  if (error instanceof Error) {
    return error.message;
  }

  return 'Unable to update the ignore file.';
}
