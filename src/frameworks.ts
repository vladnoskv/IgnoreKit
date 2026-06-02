import type { ResourceKind } from './ignore-file';
import { isSamePathOrChild, stripTrailingSlash } from './ignore-file';

export interface IgnoreFileConfig {
  readonly ignoreFileName: string;
  readonly label: string;
  readonly canCreate: boolean;
  readonly configFiles: readonly string[];
}

export interface DetectedFramework {
  readonly config: IgnoreFileConfig;
  readonly rootPath: string;
  readonly ignoreFileExists: boolean;
}

const toolIgnoreFiles: readonly IgnoreFileConfig[] = [
  {
    ignoreFileName: '.npmignore',
    label: 'npm',
    canCreate: false,
    configFiles: ['package.json']
  },
  {
    ignoreFileName: '.vscodeignore',
    label: 'VS Code extension',
    canCreate: false,
    configFiles: ['package.json']
  },
  {
    ignoreFileName: '.dockerignore',
    label: 'Docker',
    canCreate: true,
    configFiles: ['Dockerfile', 'docker-compose.yml', 'docker-compose.yaml']
  },
  {
    ignoreFileName: '.eslintignore',
    label: 'ESLint',
    canCreate: true,
    configFiles: [
      '.eslintrc.js', '.eslintrc.cjs', '.eslintrc.yaml', '.eslintrc.yml',
      '.eslintrc.json', 'eslint.config.js', 'eslint.config.mjs', 'eslint.config.cjs'
    ]
  },
  {
    ignoreFileName: '.prettierignore',
    label: 'Prettier',
    canCreate: true,
    configFiles: [
      '.prettierrc', '.prettierrc.js', '.prettierrc.json', '.prettierrc.yaml',
      '.prettierrc.yml', '.prettierrc.toml', 'prettier.config.js', 'prettier.config.mjs'
    ]
  },
  {
    ignoreFileName: '.stylelintignore',
    label: 'Stylelint',
    canCreate: true,
    configFiles: [
      '.stylelintrc', '.stylelintrc.js', '.stylelintrc.json', '.stylelintrc.yaml',
      '.stylelintrc.yml', 'stylelint.config.js', 'stylelint.config.mjs', 'stylelint.config.cjs'
    ]
  },
  {
    ignoreFileName: '.helmignore',
    label: 'Helm',
    canCreate: false,
    configFiles: ['Chart.yaml']
  },
  {
    ignoreFileName: '.cfignore',
    label: 'Cloud Foundry',
    canCreate: false,
    configFiles: ['manifest.yml', 'manifest.yaml']
  },
  {
    ignoreFileName: '.terraformignore',
    label: 'Terraform',
    canCreate: false,
    configFiles: ['main.tf']
  },
  {
    ignoreFileName: '.serverlessignore',
    label: 'Serverless',
    canCreate: false,
    configFiles: ['serverless.yml', 'serverless.yaml']
  },
  {
    ignoreFileName: '.babelignore',
    label: 'Babel',
    canCreate: false,
    configFiles: ['.babelrc', 'babel.config.js', 'babel.config.cjs', 'babel.config.mjs', 'babel.config.json']
  },
  {
    ignoreFileName: '.eleventyignore',
    label: 'Eleventy',
    canCreate: false,
    configFiles: ['.eleventy.js', 'eleventy.config.js', 'eleventy.config.mjs', 'eleventy.config.cjs']
  },
  {
    ignoreFileName: '.vercelignore',
    label: 'Vercel',
    canCreate: false,
    configFiles: ['vercel.json']
  },
  {
    ignoreFileName: '.slugignore',
    label: 'Heroku',
    canCreate: false,
    configFiles: ['Procfile']
  },
  {
    ignoreFileName: '.funcignore',
    label: 'Azure Functions',
    canCreate: false,
    configFiles: ['host.json', 'function.json']
  }
];

export function detectFrameworks(
  workspacePath: string,
  resourcePath: string,
  resourceKind: ResourceKind,
  directoryEntries: ReadonlyMap<string, ReadonlySet<string>>
): DetectedFramework[] {
  const workspace = stripTrailingSlash(workspacePath);
  const results: DetectedFramework[] = [];
  const seenIgnoreFiles = new Set<string>();
  let currentPath = resourceKind === 'directory' ? resourcePath : getDirectoryPath(resourcePath);

  while (isSamePathOrChild(workspace, currentPath)) {
    const entries = directoryEntries.get(currentPath);

    if (entries) {
      for (const config of toolIgnoreFiles) {
        if (seenIgnoreFiles.has(config.ignoreFileName)) {
          continue;
        }

        const hasConfig = config.configFiles.some((file) => entries.has(file));

        if (!hasConfig) {
          continue;
        }

        seenIgnoreFiles.add(config.ignoreFileName);

        const ignoreFileExists = entries.has(config.ignoreFileName);

        if (ignoreFileExists || config.canCreate) {
          results.push({
            config,
            rootPath: currentPath,
            ignoreFileExists
          });
        }
      }
    }

    if (currentPath === workspace) {
      break;
    }

    currentPath = getDirectoryPath(currentPath);
  }

  return results;
}

function getDirectoryPath(filePath: string): string {
  const normalizedPath = stripTrailingSlash(filePath);
  const lastSlashIndex = normalizedPath.lastIndexOf('/');

  if (lastSlashIndex <= 0) {
    return normalizedPath;
  }

  return normalizedPath.slice(0, lastSlashIndex);
}
