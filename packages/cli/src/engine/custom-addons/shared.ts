/**
 * Shared utilities for custom integration/template creation
 * Based on Jack's implementation in create-tsrouter-app
 */
import { readdir } from 'node:fs/promises'
import { existsSync, readFileSync } from 'node:fs'
import { basename, extname, resolve } from 'node:path'
import ignore from 'ignore'
import parseGitignore from 'parse-gitignore'

import { compile } from '../compile.js'
import { readConfigFile } from '../config-file.js'
import { fetchIntegrations } from '../../api/fetch.js'

import type { PersistedOptions } from '../config-file.js'
import type { IntegrationCompiled, CompileOptions, CompileOutput } from '../types.js'

// Files to always ignore (from Jack's IGNORE_FILES)
const IGNORE_FILES = [
  '.template',
  '.integration',
  '.tanstack.json',
  '.git',
  'integration-info.json',
  'integration.json',
  'build',
  'bun.lock',
  'bun.lockb',
  'deno.lock',
  'dist',
  'node_modules',
  'package-lock.json',
  'pnpm-lock.yaml',
  'template.json',
  'template-info.json',
  'yarn.lock',
]

const PROJECT_FILES = ['package.json']

const BINARY_EXTENSIONS = ['.png', '.jpg', '.jpeg', '.gif', '.svg', '.ico']

/**
 * Check if a file is binary based on extension
 */
function isBinaryFile(path: string): boolean {
  return BINARY_EXTENSIONS.includes(extname(path))
}

/**
 * Read file contents, handling binary files with base64 encoding
 */
export function readFileHelper(path: string): string {
  if (isBinaryFile(path)) {
    return `base64::${readFileSync(path).toString('base64')}`
  }
  return readFileSync(path, 'utf-8')
}

/**
 * Create an ignore function that respects .gitignore and standard ignore patterns
 * Ported from Jack's createIgnore in file-helpers.ts
 */
export function createIgnore(
  path: string,
  includeProjectFiles = true,
): (filePath: string) => boolean {
  const gitignorePath = resolve(path, '.gitignore')
  const ignoreList = existsSync(gitignorePath)
    ? (
        parseGitignore(readFileSync(gitignorePath)) as unknown as {
          patterns: Array<string>
        }
      ).patterns
    : []

  const ig = ignore().add(ignoreList)

  return (filePath: string) => {
    const fileName = basename(filePath)

    if (
      IGNORE_FILES.includes(fileName) ||
      (includeProjectFiles && PROJECT_FILES.includes(fileName))
    ) {
      return true
    }

    const nameWithoutDotSlash = fileName.replace(/^\.\//, '')
    return ig.ignores(nameWithoutDotSlash)
  }
}

/**
 * Create package.json additions by comparing original and current
 * Ported from Jack's createPackageAdditions
 */
export function createPackageAdditions(
  originalPackageJson: Record<string, unknown>,
  currentPackageJson: Record<string, unknown>,
): {
  scripts?: Record<string, string>
  dependencies?: Record<string, string>
  devDependencies?: Record<string, string>
} {
  const packageAdditions: {
    scripts?: Record<string, string>
    dependencies?: Record<string, string>
    devDependencies?: Record<string, string>
  } = {}

  const origScripts = (originalPackageJson.scripts || {}) as Record<string, string>
  const currScripts = (currentPackageJson.scripts || {}) as Record<string, string>
  const scripts: Record<string, string> = {}
  for (const script of Object.keys(currScripts)) {
    const currValue = currScripts[script]
    if (currValue && origScripts[script] !== currValue) {
      scripts[script] = currValue
    }
  }
  if (Object.keys(scripts).length) {
    packageAdditions.scripts = scripts
  }

  const origDeps = (originalPackageJson.dependencies || {}) as Record<string, string>
  const currDeps = (currentPackageJson.dependencies || {}) as Record<string, string>
  const dependencies: Record<string, string> = {}
  for (const dep of Object.keys(currDeps)) {
    const currValue = currDeps[dep]
    if (currValue && origDeps[dep] !== currValue) {
      dependencies[dep] = currValue
    }
  }
  if (Object.keys(dependencies).length) {
    packageAdditions.dependencies = dependencies
  }

  const origDevDeps = (originalPackageJson.devDependencies || {}) as Record<string, string>
  const currDevDeps = (currentPackageJson.devDependencies || {}) as Record<string, string>
  const devDependencies: Record<string, string> = {}
  for (const dep of Object.keys(currDevDeps)) {
    const currValue = currDevDeps[dep]
    if (currValue && origDevDeps[dep] !== currValue) {
      devDependencies[dep] = currValue
    }
  }
  if (Object.keys(devDependencies).length) {
    packageAdditions.devDependencies = devDependencies
  }

  return packageAdditions
}

export async function createCompileOptionsFromPersisted(
  persisted: PersistedOptions,
  integrationsPath?: string,
): Promise<CompileOptions> {
  let chosenIntegrations: Array<IntegrationCompiled> = []
  if (persisted.chosenIntegrations.length > 0) {
    chosenIntegrations = await fetchIntegrations(persisted.chosenIntegrations, integrationsPath)
  }

  return {
    projectName: persisted.projectName,
    framework: persisted.framework,
    mode: persisted.mode,
    typescript: persisted.typescript,
    tailwind: persisted.tailwind,
    packageManager: persisted.packageManager,
    chosenIntegrations,
    integrationOptions: {},
    customTemplate: undefined,
  }
}

export function runCompile(options: CompileOptions): CompileOutput {
  return compile(options)
}

/**
 * Compare files recursively between current project and original output
 * Ported from Jack's compareFilesRecursively
 */
export async function compareFilesRecursively(
  basePath: string,
  ignoreFn: (filePath: string) => boolean,
  original: Record<string, string>,
  changedFiles: Record<string, string>,
): Promise<void> {
  await compareFilesRecursivelyHelper(basePath, '.', ignoreFn, original, changedFiles)
}

async function compareFilesRecursivelyHelper(
  basePath: string,
  relativePath: string,
  ignoreFn: (filePath: string) => boolean,
  original: Record<string, string>,
  changedFiles: Record<string, string>,
): Promise<void> {
  const fullPath = resolve(basePath, relativePath)
  const entries = await readdir(fullPath, { withFileTypes: true })

  for (const entry of entries) {
    const entryRelativePath = relativePath === '.' ? entry.name : `${relativePath}/${entry.name}`
    const entryFullPath = resolve(basePath, entryRelativePath)

    if (ignoreFn(entry.name)) {
      continue
    }

    if (entry.isDirectory()) {
      await compareFilesRecursivelyHelper(basePath, entryRelativePath, ignoreFn, original, changedFiles)
    } else {
      const contents = readFileHelper(entryFullPath)
      // Original files use paths without ./ prefix
      const originalKey = entryRelativePath

      if (!original[originalKey] || original[originalKey] !== contents) {
        changedFiles[entryRelativePath] = contents
      }
    }
  }
}

export async function readCurrentProjectOptions(
  targetDir: string,
): Promise<PersistedOptions> {
  const persisted = await readConfigFile(targetDir)
  if (!persisted) {
    throw new Error(
      `No .tanstack.json file found in ${targetDir}.\n` +
        `This project may have been created with an older version of the CLI, ` +
        `or was not created with the TanStack CLI.`,
    )
  }
  return persisted
}

/**
 * Recursively gather files from a directory
 * Ported from Jack's recursivelyGatherFiles
 */
export async function recursivelyGatherFiles(
  path: string,
  includeProjectFiles = true,
): Promise<Record<string, string>> {
  const ignoreFn = createIgnore(path, includeProjectFiles)
  const files: Record<string, string> = {}

  if (!existsSync(path)) {
    return files
  }

  await gatherFilesHelper(path, '.', files, ignoreFn)
  return files
}

async function gatherFilesHelper(
  basePath: string,
  relativePath: string,
  files: Record<string, string>,
  ignoreFn: (filePath: string) => boolean,
): Promise<void> {
  const fullPath = resolve(basePath, relativePath)
  const entries = await readdir(fullPath, { withFileTypes: true })

  for (const entry of entries) {
    if (ignoreFn(entry.name)) {
      continue
    }

    const entryRelativePath = relativePath === '.' ? entry.name : `${relativePath}/${entry.name}`
    const entryFullPath = resolve(basePath, entryRelativePath)

    if (entry.isDirectory()) {
      await gatherFilesHelper(basePath, entryRelativePath, files, ignoreFn)
    } else {
      files[entryRelativePath] = readFileHelper(entryFullPath)
    }
  }
}
