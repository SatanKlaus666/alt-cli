import { mkdir, readFile, writeFile } from 'node:fs/promises'
import { existsSync, mkdirSync, writeFileSync } from 'node:fs'
import { basename, dirname, resolve } from 'node:path'

import { IntegrationCompiledSchema } from '../types.js'
import {
  compareFilesRecursively,
  createCompileOptionsFromPersisted,
  createIgnore,
  createPackageAdditions,
  readCurrentProjectOptions,
  recursivelyGatherFiles,
  runCompile,
} from './shared.js'

import type { PersistedOptions } from '../config-file.js'
import type { IntegrationCompiled, IntegrationInfo, Route } from '../types.js'

const INTEGRATION_DIR = '.integration'
const INFO_FILE = '.integration/info.json'
const COMPILED_FILE = 'integration.json'
const ASSETS_DIR = 'assets'

// Files to ignore when building integration assets (these are generated or template-specific)
const INTEGRATION_IGNORE_FILES = [
  'main.jsx',
  'App.jsx',
  'main.tsx',
  'App.tsx',
  'routeTree.gen.ts',
]

function camelCase(str: string): string {
  return str
    .split(/(\.|-|\/)/)
    .filter((part) => /^[a-zA-Z]+$/.test(part))
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join('')
}

function templatize(routeCode: string, routeFile: string): {
  url: string
  code: string
  name: string
  jsName: string
} {
  let code = routeCode

  // Replace the import
  code = code.replace(
    /import { createFileRoute } from ['"]@tanstack\/react-router['"]/g,
    `import { <% if (fileRouter) { %>createFileRoute<% } else { %>createRoute<% } %> } from '@tanstack/react-router'`,
  )

  // Extract route path and definition, then transform the route declaration
  const routeMatch = code.match(
    /export\s+const\s+Route\s*=\s*createFileRoute\(['"]([^'"]+)['"]\)\s*\(\{([^}]+)\}\)/,
  )

  let path = ''

  if (routeMatch) {
    const fullMatch = routeMatch[0]
    path = routeMatch[1]!
    const routeDefinition = routeMatch[2]
    code = code.replace(
      fullMatch,
      `<% if (codeRouter) { %>
import type { RootRoute } from '@tanstack/react-router'
<% } else { %>
export const Route = createFileRoute('${path}')({${routeDefinition}})
<% } %>`,
    )

    code += `
<% if (codeRouter) { %>
export default (parentRoute: RootRoute) => createRoute({
  path: '${path}',
  ${routeDefinition}
  getParentRoute: () => parentRoute,
})
<% } %>
`
  } else {
    console.warn(`No route found in the file: ${routeFile}`)
  }

  const name = basename(path)
    .replace('.tsx', '')
    .replace(/^demo/, '')
    .replace('.', ' ')
    .trim()

  const jsName = camelCase(basename(path))

  return { url: path, code, name, jsName }
}

async function validateIntegrationSetup(targetDir: string): Promise<void> {
  const options = await readCurrentProjectOptions(targetDir)

  if (options.mode === 'code-router') {
    throw new Error(
      'This project is using code-router mode.\n' +
      'To create an integration, the project must use file-router mode.',
    )
  }
  if (!options.tailwind) {
    throw new Error(
      'This project is not using Tailwind CSS.\n' +
      'To create an integration, the project must be created with Tailwind CSS.',
    )
  }
  if (!options.typescript) {
    throw new Error(
      'This project is not using TypeScript.\n' +
      'To create an integration, the project must be created with TypeScript.',
    )
  }
}

async function readOrGenerateIntegrationInfo(
  options: PersistedOptions,
  targetDir: string,
): Promise<IntegrationInfo> {
  const infoPath = resolve(targetDir, INFO_FILE)

  if (existsSync(infoPath)) {
    const content = await readFile(infoPath, 'utf-8')
    return JSON.parse(content)
  }

  return {
    id: `${options.projectName}-integration`,
    name: `${options.projectName} Integration`,
    description: 'Custom integration',
    author: 'Author <author@example.com>',
    version: '0.0.1',
    license: 'MIT',
    link: `https://github.com/example/${options.projectName}-integration`,

    type: 'integration',
    phase: 'integration',
    modes: [options.mode],

    requiresTailwind: options.tailwind || undefined,

    dependsOn: options.chosenIntegrations.length > 0 ? options.chosenIntegrations : undefined,

    routes: [],
    packageAdditions: {
      scripts: {},
      dependencies: {},
      devDependencies: {},
    },
  }
}

async function generateBaseProject(
  persistedOptions: PersistedOptions,
  targetDir: string,
  integrationsPath?: string,
): Promise<{ info: IntegrationInfo; output: { files: Record<string, string> } }> {
  const info = await readOrGenerateIntegrationInfo(persistedOptions, targetDir)

  const compileOptions = await createCompileOptionsFromPersisted(
    persistedOptions,
    integrationsPath,
  )

  const output = runCompile(compileOptions)

  return { info, output }
}

async function buildAssetsDirectory(
  targetDir: string,
  output: { files: Record<string, string> },
  info: IntegrationInfo,
): Promise<void> {
  const assetsDir = resolve(targetDir, INTEGRATION_DIR, ASSETS_DIR)

  // Only build if assets directory doesn't exist yet
  if (existsSync(assetsDir)) {
    return
  }

  const ignoreFn = createIgnore(targetDir)
  const changedFiles: Record<string, string> = {}
  await compareFilesRecursively(targetDir, ignoreFn, output.files, changedFiles)

  for (const file of Object.keys(changedFiles)) {
    // Skip ignored files
    if (INTEGRATION_IGNORE_FILES.includes(basename(file))) {
      continue
    }

    const targetPath = resolve(assetsDir, file)
    mkdirSync(dirname(targetPath), { recursive: true })

    // Templatize route files
    const fileContent = changedFiles[file]!
    if (file.includes('/routes/')) {
      const { url, code, name, jsName } = templatize(fileContent, file)

      info.routes ||= []
      const existingRoute = info.routes.find((r: Route) => r.url === url)
      if (!existingRoute) {
        info.routes.push({
          url,
          name,
          jsName,
          path: file,
        })
      }

      writeFileSync(`${targetPath}.ejs`, code)
    } else {
      writeFileSync(targetPath, fileContent)
    }
  }
}

async function updateIntegrationInfo(
  targetDir: string,
  integrationsPath?: string,
): Promise<void> {
  const persistedOptions = await readCurrentProjectOptions(targetDir)
  const { info, output } = await generateBaseProject(persistedOptions, targetDir, integrationsPath)

  // Calculate package.json differences
  const originalPackageJson = JSON.parse(output.files['package.json']!)
  const currentPackageJson = JSON.parse(
    await readFile(resolve(targetDir, 'package.json'), 'utf-8'),
  )

  info.packageAdditions = createPackageAdditions(
    originalPackageJson,
    currentPackageJson,
  )

  await buildAssetsDirectory(targetDir, output, info)

  // Write info file
  const infoDir = resolve(targetDir, dirname(INFO_FILE))
  await mkdir(infoDir, { recursive: true })
  await writeFile(
    resolve(targetDir, INFO_FILE),
    JSON.stringify(info, null, 2),
  )
}

export async function compileIntegration(
  targetDir: string,
  _integrationsPath?: string,
): Promise<void> {
  const persistedOptions = await readCurrentProjectOptions(targetDir)
  const info = await readOrGenerateIntegrationInfo(persistedOptions, targetDir)

  const assetsDir = resolve(targetDir, INTEGRATION_DIR, ASSETS_DIR)

  const compiledInfo: IntegrationCompiled = {
    ...info,
    id: info.id || `${persistedOptions.projectName}-integration`,
    files: await recursivelyGatherFiles(assetsDir),
    deletedFiles: [],
  }

  await writeFile(
    resolve(targetDir, COMPILED_FILE),
    JSON.stringify(compiledInfo, null, 2),
  )

  console.log(`Compiled integration written to ${COMPILED_FILE}`)
}

export async function initIntegration(
  targetDir: string,
  integrationsPath?: string,
): Promise<void> {
  await validateIntegrationSetup(targetDir)
  await updateIntegrationInfo(targetDir, integrationsPath)
  await compileIntegration(targetDir, integrationsPath)

  console.log(`
Integration initialized successfully!

Files created:
  ${INFO_FILE} - Integration metadata (edit this to customize)
  ${INTEGRATION_DIR}/${ASSETS_DIR}/ - Integration asset files
  ${COMPILED_FILE} - Compiled integration (distribute this)

Next steps:
  1. Edit ${INFO_FILE} to customize your integration metadata
  2. Run 'tanstack integration compile' to rebuild after changes
  3. Share ${COMPILED_FILE} or host it publicly
`)
}

/**
 * Load a remote integration from a URL
 */
export async function loadRemoteIntegration(url: string): Promise<IntegrationCompiled> {
  const response = await fetch(url)
  if (!response.ok) {
    throw new Error(`Failed to fetch integration from ${url}: ${response.statusText}`)
  }

  const jsonContent = await response.json()

  const result = IntegrationCompiledSchema.safeParse(jsonContent)
  if (!result.success) {
    throw new Error(`Invalid integration at ${url}: ${result.error.message}`)
  }

  const integration = result.data
  // Use the URL as the ID if not set
  if (!integration.id) {
    integration.id = url
  }

  return integration
}
