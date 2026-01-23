import { resolve } from 'node:path'
import { existsSync, mkdirSync, writeFileSync } from 'node:fs'
import {
  cancel,
  confirm,
  intro,
  isCancel,
  log,
  multiselect,
  note,
  outro,
  select,
  spinner,
  text,
} from '@clack/prompts'
import chalk from 'chalk'
import { fetchIntegrations, fetchManifest } from '../api/fetch.js'
import { compile } from '../engine/compile.js'
import { writeConfigFile } from '../engine/config-file.js'
import { loadTemplate } from '../engine/custom-addons/template.js'
import type {
  CustomTemplateCompiled,
  IntegrationCompiled,
  ManifestIntegration,
  PackageManager,
  RouterMode,
} from '../engine/types.js'

interface CreateOptions {
  template?: string
  packageManager?: PackageManager
  integrations?: string
  install?: boolean
  git?: boolean
  tailwind?: boolean
  yes?: boolean
  targetDir?: string
  integrationsPath?: string
}

const PACKAGE_MANAGERS: Array<PackageManager> = [
  'pnpm',
  'npm',
  'yarn',
  'bun',
  'deno',
]

function detectPackageManager(): PackageManager {
  const userAgent = process.env.npm_config_user_agent
  if (userAgent) {
    if (userAgent.includes('pnpm')) return 'pnpm'
    if (userAgent.includes('yarn')) return 'yarn'
    if (userAgent.includes('bun')) return 'bun'
    if (userAgent.includes('deno')) return 'deno'
  }
  return 'npm'
}

function validateProjectName(name: string): { valid: boolean; error?: string } {
  if (!name) {
    return { valid: false, error: 'Project name is required' }
  }
  if (!/^[a-z0-9-_]+$/.test(name)) {
    return {
      valid: false,
      error:
        'Project name can only contain lowercase letters, numbers, hyphens, and underscores',
    }
  }
  return { valid: true }
}

function groupIntegrationsByCategory(
  integrations: Array<ManifestIntegration>,
): Record<string, Array<ManifestIntegration>> {
  const groups: Record<string, Array<ManifestIntegration>> = {}
  for (const integration of integrations) {
    const category = integration.category ?? 'other'
    groups[category] ??= []
    groups[category].push(integration)
  }
  return groups
}

const CATEGORY_LABELS: Record<string, string> = {
  tanstack: 'TanStack',
  database: 'Database',
  orm: 'ORM',
  auth: 'Authentication',
  deploy: 'Deployment',
  tooling: 'Tooling',
  monitoring: 'Monitoring',
  api: 'API',
  i18n: 'Internationalization',
  cms: 'CMS',
  other: 'Other',
}

const CATEGORY_ORDER = [
  'tanstack',
  'database',
  'orm',
  'auth',
  'deploy',
  'api',
  'monitoring',
  'tooling',
  'i18n',
  'cms',
  'other',
]

export async function runCreate(
  projectName: string | undefined,
  options: CreateOptions,
): Promise<void> {
  intro(chalk.bgCyan(chalk.black(' TanStack Start ')))

  const s = spinner()

  // Determine integrations source
  const integrationsPath = options.integrationsPath

  // Fetch manifest
  s.start('Fetching available integrations...')
  let manifest
  try {
    manifest = await fetchManifest(integrationsPath)
    s.stop('Integrations loaded')
  } catch (error) {
    s.stop('Failed to fetch integrations')
    log.error(
      'Could not fetch integration manifest. Check your internet connection.',
    )
    process.exit(1)
  }

  // Project name
  let name = projectName
  if (!name && !options.yes) {
    const nameInput = await text({
      message: 'Project name:',
      placeholder: 'my-tanstack-app',
      defaultValue: 'my-tanstack-app',
      validate: (value) => {
        const result = validateProjectName(value)
        return result.valid ? undefined : result.error
      },
    })

    if (isCancel(nameInput)) {
      cancel('Operation cancelled.')
      process.exit(0)
    }

    name = nameInput
  }

  name = name ?? 'my-tanstack-app'
  const { valid, error } = validateProjectName(name)
  if (!valid) {
    log.error(error ?? 'Invalid project name')
    process.exit(1)
  }

  // Target directory
  const targetDir = options.targetDir
    ? resolve(options.targetDir)
    : resolve(process.cwd(), name)

  if (existsSync(targetDir)) {
    if (!options.yes) {
      const overwrite = await confirm({
        message: `Directory ${chalk.cyan(name)} already exists. Overwrite?`,
        initialValue: false,
      })

      if (isCancel(overwrite) || !overwrite) {
        cancel('Operation cancelled.')
        process.exit(0)
      }
    }
  }

  // Package manager
  let packageManager: PackageManager = options.packageManager ?? detectPackageManager()
  if (!options.packageManager && !options.yes) {
    const pmChoice = await select({
      message: 'Package manager:',
      options: PACKAGE_MANAGERS.map((pm) => ({
        value: pm,
        label: pm,
      })),
      initialValue: packageManager,
    })

    if (isCancel(pmChoice)) {
      cancel('Operation cancelled.')
      process.exit(0)
    }

    packageManager = pmChoice
  }

  // Tailwind
  let tailwind = options.tailwind ?? true
  if (options.tailwind === undefined && !options.yes) {
    const twChoice = await confirm({
      message: 'Include Tailwind CSS?',
      initialValue: true,
    })

    if (isCancel(twChoice)) {
      cancel('Operation cancelled.')
      process.exit(0)
    }

    tailwind = twChoice
  }

  // Integrations selection
  let selectedIntegrationIds: Array<string> = []

  if (options.integrations) {
    selectedIntegrationIds = options.integrations.split(',').map((s) => s.trim())
  } else if (!options.yes) {
    // Group integrations by category for display
    const availableIntegrations = manifest.integrations.filter(
      (a) => a.type === 'integration' && a.modes.includes('file-router'),
    )
    const grouped = groupIntegrationsByCategory(availableIntegrations)

    // Show category selection first
    const categoryOptions = CATEGORY_ORDER.filter((cat) => grouped[cat]?.length)
      .map((cat) => ({
        value: cat,
        label: CATEGORY_LABELS[cat] ?? cat,
        hint: `${grouped[cat]!.length} integrations`,
      }))

    note(
      'Use arrow keys to navigate, space to select/deselect, enter to confirm.',
      'Integration Selection',
    )

    const selectedCategories = await multiselect({
      message: 'Which categories would you like to explore?',
      options: categoryOptions,
      required: false,
    })

    if (isCancel(selectedCategories)) {
      cancel('Operation cancelled.')
      process.exit(0)
    }

    // For each selected category, show integration selection
    for (const category of selectedCategories) {
      const categoryIntegrations = grouped[category]
      if (!categoryIntegrations?.length) continue

      const integrationChoices = await multiselect({
        message: `Select ${CATEGORY_LABELS[category]} integrations:`,
        options: categoryIntegrations.map((integration) => ({
          value: integration.id,
          label: integration.name,
          hint: integration.description,
        })),
        required: false,
      })

      if (isCancel(integrationChoices)) {
        cancel('Operation cancelled.')
        process.exit(0)
      }

      selectedIntegrationIds.push(...(integrationChoices))
    }
  }

  // Resolve dependencies
  const integrationMap = new Map<string, ManifestIntegration>(
    manifest.integrations.map((a) => [a.id, a]),
  )
  const resolvedIds = new Set(selectedIntegrationIds)

  for (const id of selectedIntegrationIds) {
    const integration = integrationMap.get(id)
    if (integration?.dependsOn) {
      for (const dep of integration.dependsOn) {
        resolvedIds.add(dep)
      }
    }
  }

  // Show summary
  if (resolvedIds.size > 0) {
    const integrationList = Array.from(resolvedIds)
      .map((id) => {
        const integration = integrationMap.get(id)
        const isDep =
          !selectedIntegrationIds.includes(id) && resolvedIds.has(id)
        return `  ${isDep ? chalk.dim('(auto)') : chalk.green('+')} ${integration?.name ?? id}`
      })
      .join('\n')

    note(integrationList, 'Selected Integrations')
  }

  // Confirm
  if (!options.yes) {
    const proceed = await confirm({
      message: 'Create project?',
      initialValue: true,
    })

    if (isCancel(proceed) || !proceed) {
      cancel('Operation cancelled.')
      process.exit(0)
    }
  }

  // Fetch full addon definitions
  s.start('Preparing project...')

  // Load custom template if provided
  let customTemplate: CustomTemplateCompiled | undefined
  if (options.template) {
    try {
      customTemplate = await loadTemplate(options.template)
      // Add template's integrations to resolved integrations
      for (const integrationId of customTemplate.integrations) {
        resolvedIds.add(integrationId)
      }
      // Use template's settings as defaults
      tailwind = customTemplate.tailwind
    } catch (error) {
      s.stop('Failed to load template')
      log.error(
        error instanceof Error
          ? error.message
          : 'Could not load template from URL.',
      )
      process.exit(1)
    }
  }

  let chosenIntegrations: Array<IntegrationCompiled> = []
  if (resolvedIds.size > 0) {
    try {
      chosenIntegrations = await fetchIntegrations(Array.from(resolvedIds), integrationsPath)
    } catch (error) {
      s.stop('Failed to fetch integration details')
      log.error('Could not fetch integration definitions.')
      process.exit(1)
    }
  }

  // Compile project - use custom template settings if provided
  const compileOptions = {
    projectName: name,
    framework: customTemplate?.framework ?? 'react',
    mode: customTemplate?.mode ?? ('file-router' as RouterMode),
    typescript: customTemplate?.typescript ?? true,
    tailwind,
    packageManager,
    chosenIntegrations,
    integrationOptions: customTemplate?.integrationOptions ?? {},
    customTemplate,
  }

  const output = compile(compileOptions)

  s.stop('Project prepared')

  // Write files
  s.start('Writing files...')

  mkdirSync(targetDir, { recursive: true })

  for (const [filePath, content] of Object.entries(output.files)) {
    const fullPath = resolve(targetDir, filePath)
    const dir = resolve(fullPath, '..')
    mkdirSync(dir, { recursive: true })
    writeFileSync(fullPath, content, 'utf-8')
  }

  // Write config file for integration/template creation
  await writeConfigFile(targetDir, compileOptions)

  s.stop('Files written')

  // Initialize git
  if (options.git !== false) {
    s.start('Initializing git repository...')
    try {
      const { execSync } = await import('node:child_process')
      execSync('git init', { cwd: targetDir, stdio: 'ignore' })
      s.stop('Git initialized')
    } catch {
      s.stop('Git initialization skipped')
    }
  }

  // Install dependencies
  if (options.install !== false) {
    s.start(`Installing dependencies with ${packageManager}...`)
    const startTime = Date.now()
    const interval = setInterval(() => {
      const elapsed = Math.floor((Date.now() - startTime) / 1000)
      s.message(`Installing dependencies with ${packageManager}... (${elapsed}s)`)
    }, 1000)

    try {
      const { execSync } = await import('node:child_process')
      const installCmd =
        packageManager === 'yarn' ? 'yarn' : `${packageManager} install`
      execSync(installCmd, { cwd: targetDir, stdio: 'ignore' })
      clearInterval(interval)
      const total = Math.floor((Date.now() - startTime) / 1000)
      s.stop(`Dependencies installed (${total}s)`)
    } catch {
      clearInterval(interval)
      s.stop('Dependency installation failed')
      log.warning(`Run "${packageManager} install" manually to install dependencies.`)
    }
  }

  // Show next steps
  const relativePath = resolve(process.cwd()) === targetDir ? '.' : name

  outro(chalk.green('Project created successfully!'))

  console.log()
  console.log('Next steps:')
  console.log()
  if (relativePath !== '.') {
    console.log(`  ${chalk.cyan('cd')} ${relativePath}`)
  }
  if (options.install === false) {
    console.log(`  ${chalk.cyan(packageManager)} install`)
  }
  console.log(`  ${chalk.cyan(packageManager)} ${packageManager === 'npm' ? 'run ' : ''}dev`)
  console.log()

  // Show env vars if any
  if (output.envVars.length > 0) {
    console.log(chalk.yellow('Environment variables needed:'))
    console.log()
    for (const envVar of output.envVars) {
      console.log(`  ${chalk.cyan(envVar.name)} - ${envVar.description}`)
    }
    console.log()
    console.log(`  Add these to your ${chalk.cyan('.env.local')} file.`)
    console.log()
  }

  // Show warnings
  for (const warning of output.warnings) {
    log.warning(warning)
  }
}
