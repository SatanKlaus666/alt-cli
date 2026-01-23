import { render } from 'ejs'
import type {
  CompileOptions,
  Hook,
  IntegrationCompiled,
  Route,
} from './types.js'

/**
 * Convert _dot_ prefixes to actual dots (for dotfiles)
 */
function convertDotFiles(path: string): string {
  return path
    .split('/')
    .map((segment) => segment.replace(/^_dot_/, '.'))
    .join('/')
}

/**
 * Strip option prefixes from filename
 * e.g., __postgres__schema.prisma -> schema.prisma
 */
function stripOptionPrefix(path: string): string {
  const match = path.match(/^(.+\/)?__([^_]+)__(.+)$/)
  if (match) {
    const [, directory, , filename] = match
    return (directory || '') + filename
  }
  return path
}

/**
 * Calculate relative path between two file paths
 */
export function relativePath(
  from: string,
  to: string,
  stripExtension: boolean = false,
): string {
  const fromParts = from.split('/').slice(0, -1) // Remove filename
  const toParts = to.split('/')

  // Find common prefix length
  let commonLength = 0
  while (
    commonLength < fromParts.length &&
    commonLength < toParts.length &&
    fromParts[commonLength] === toParts[commonLength]
  ) {
    commonLength++
  }

  // Build relative path
  const upCount = fromParts.length - commonLength
  const ups = Array(upCount).fill('..')
  const remainder = toParts.slice(commonLength)

  let result = [...ups, ...remainder].join('/')
  if (!result.startsWith('.')) {
    result = './' + result
  }

  if (stripExtension) {
    result = result.replace(/\.[^/.]+$/, '')
  }

  return result
}

/**
 * Error thrown when ignoreFile() is called in a template
 */
class IgnoreFileError extends Error {
  constructor() {
    super('ignoreFile')
    this.name = 'IgnoreFileError'
  }
}

export interface TemplateContext {
  // Project config
  packageManager: string
  projectName: string
  typescript: boolean
  tailwind: boolean
  js: 'ts' | 'js'
  jsx: 'tsx' | 'jsx'

  // Router mode
  fileRouter: boolean
  codeRouter: boolean

  // Integration state
  integrationEnabled: Record<string, boolean>
  integrationOption: Record<string, Record<string, unknown>>
  integrations: Array<IntegrationCompiled>
  hooks: Array<Hook>
  routes: Array<Route>

  // Helper functions
  getPackageManagerAddScript: (pkg: string, isDev?: boolean) => string
  getPackageManagerRunScript: (script: string, args?: Array<string>) => string
  relativePath: (to: string, stripExt?: boolean) => string
  hookImportContent: (hook: Hook) => string
  hookImportCode: (hook: Hook) => string
  ignoreFile: () => never
}

/**
 * Create template context from compile options
 */
export function createTemplateContext(
  options: CompileOptions,
  currentFile: string,
): TemplateContext {
  // Collect all hooks from chosen integrations
  const hooks: Array<Hook> = []
  for (const integration of options.chosenIntegrations) {
    if (integration.hooks) {
      hooks.push(...integration.hooks)
    }
  }

  // Collect all routes from chosen integrations
  const routes: Array<Route> = []
  for (const integration of options.chosenIntegrations) {
    if (integration.routes) {
      routes.push(...integration.routes)
    }
  }

  // Build integration enabled map
  const integrationEnabled: Record<string, boolean> = {}
  for (const integration of options.chosenIntegrations) {
    integrationEnabled[integration.id] = true
  }

  // Helper to calculate relative path from current file
  const localRelativePath = (to: string, stripExt: boolean = false) =>
    relativePath(currentFile, to, stripExt)

  // Helper to generate import statement for hook
  const hookImportContent = (hook: Hook) =>
    hook.import ||
    `import ${hook.jsName} from '${localRelativePath(hook.path || '')}'`

  // Helper to get the code/value for a hook
  const hookImportCode = (hook: Hook) =>
    hook.code || hook.jsName || ''

  return {
    packageManager: options.packageManager,
    projectName: options.projectName,
    typescript: options.typescript,
    tailwind: options.tailwind,
    js: options.typescript ? 'ts' : 'js',
    jsx: options.typescript ? 'tsx' : 'jsx',

    fileRouter: options.mode === 'file-router',
    codeRouter: options.mode === 'code-router',

    integrationEnabled,
    integrationOption: options.integrationOptions,
    integrations: options.chosenIntegrations,
    hooks,
    routes,

    getPackageManagerAddScript: (pkg: string, isDev: boolean = false) => {
      const pm = options.packageManager
      if (pm === 'npm') return `npm install ${isDev ? '-D ' : ''}${pkg}`
      if (pm === 'yarn') return `yarn add ${isDev ? '-D ' : ''}${pkg}`
      if (pm === 'pnpm') return `pnpm add ${isDev ? '-D ' : ''}${pkg}`
      if (pm === 'bun') return `bun add ${isDev ? '-d ' : ''}${pkg}`
      // eslint-disable-next-line @typescript-eslint/no-unnecessary-condition
      if (pm === 'deno') return `deno add ${pkg}`
      return `npm install ${isDev ? '-D ' : ''}${pkg}`
    },

    getPackageManagerRunScript: (
      script: string,
      args: Array<string> = [],
    ) => {
      const pm = options.packageManager
      const argsStr = args.length ? ' ' + args.join(' ') : ''
      if (pm === 'npm') return `npm run ${script}${argsStr}`
      if (pm === 'yarn') return `yarn ${script}${argsStr}`
      if (pm === 'pnpm') return `pnpm ${script}${argsStr}`
      if (pm === 'bun') return `bun run ${script}${argsStr}`
      // eslint-disable-next-line @typescript-eslint/no-unnecessary-condition
      if (pm === 'deno') return `deno task ${script}${argsStr}`
      return `npm run ${script}${argsStr}`
    },

    relativePath: localRelativePath,
    hookImportContent,
    hookImportCode,

    ignoreFile: () => {
      throw new IgnoreFileError()
    },
  }
}

export interface ProcessedFile {
  path: string
  content: string
  append: boolean
}

/**
 * Process a template file with EJS
 */
export function processTemplateFile(
  filePath: string,
  content: string,
  options: CompileOptions,
): ProcessedFile | null {
  const context = createTemplateContext(options, filePath)

  let processedContent = content
  let shouldIgnore = false

  // Process EJS if file ends with .ejs
  if (filePath.endsWith('.ejs')) {
    try {
      processedContent = render(content, context)
    } catch (error) {
      if (error instanceof IgnoreFileError) {
        shouldIgnore = true
      } else {
        throw new Error(`EJS error in file ${filePath}: ${error}`)
      }
    }
  }

  if (shouldIgnore) {
    return null
  }

  // Process path transformations
  let outputPath = filePath

  // Remove .ejs extension
  outputPath = outputPath.replace(/\.ejs$/, '')

  // Convert _dot_ to .
  outputPath = convertDotFiles(outputPath)

  // Strip option prefixes
  outputPath = stripOptionPrefix(outputPath)

  // Check for .append suffix
  let append = false
  if (outputPath.endsWith('.append')) {
    append = true
    outputPath = outputPath.replace(/\.append$/, '')
  }

  // Convert .ts/.tsx to .js/.jsx if not TypeScript
  if (!options.typescript) {
    outputPath = outputPath.replace(/\.tsx$/, '.jsx').replace(/\.ts$/, '.js')
  }

  return {
    path: outputPath,
    content: processedContent,
    append,
  }
}
